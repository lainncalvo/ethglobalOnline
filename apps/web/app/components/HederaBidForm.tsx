"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { bidEscrowAbi, erc20Abi } from "@/lib/abi";
import { HEDERA_CHAIN_ID, HEDERA_WALLET_TX, USDC_DECIMALS } from "@/lib/constants";
import { formatUsdc, parseDecimalInput } from "@/lib/format";
import { assertMinedSuccess } from "@/lib/tx";
import { getHederaRailAddresses, htsAssociateAbi } from "@/lib/hedera-addresses";
import { registerHederaRail } from "@/lib/hedera-api";
import { ActionReceipt, type ReceiptLink } from "./ActionReceipt";
import { NetworkGuard } from "./NetworkGuard";
import { InlineStatus, TxError } from "./TxError";

type BidReceipt = {
  associateHash?: Hex;
  approveHash?: Hex;
  bidHash: Hex;
  escrowed: bigint;
  onChainTotal: bigint;
};

export function HederaBidForm({
  auctionRef,
  disabled,
  reason,
  currentBid,
}: {
  auctionRef: Hex;
  disabled: boolean;
  reason?: string;
  currentBid?: string | null;
}) {
  const { hederaBidEscrow: escrow, hederaUsdc: usdc } = getHederaRailAddresses();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: HEDERA_CHAIN_ID });
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("2");
  const [approveHash, setApproveHash] = useState<Hex>();
  const [associateHash, setAssociateHash] = useState<Hex>();
  const [receipt, setReceipt] = useState<BidReceipt>();
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState<string>();

  const allowance = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && escrow ? [address, escrow] : undefined,
    chainId: HEDERA_CHAIN_ID,
    query: { enabled: Boolean(address && escrow), refetchInterval: 5_000 },
  });
  const balance = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: HEDERA_CHAIN_ID,
    query: { enabled: Boolean(address && usdc), refetchInterval: 5_000 },
  });

  let parsed = 0n;
  try {
    parsed = parseDecimalInput(amount, USDC_DECIMALS);
  } catch {
    parsed = 0n;
  }
  const currentAllowance = allowance.data ?? 0n;
  const needsApprove = currentAllowance < parsed;
  // Spec sequence is associate → approve → placeBid. A successful associate
  // this session must not skip Approve just because leftover allowance exists.
  const awaitingApproveAfterAssociate = Boolean(associateHash) && !approveHash;
  const approveNeeded = needsApprove || awaitingApproveAfterAssociate;
  const wrongChain = isConnected && chainId !== HEDERA_CHAIN_ID;
  const formLocked = disabled || !isConnected || !escrow || parsed <= 0n || wrongChain;
  const previousBid = currentBid ? BigInt(currentBid) : 0n;

  async function ensureHedera() {
    if (chainId !== HEDERA_CHAIN_ID) {
      await switchChainAsync({ chainId: HEDERA_CHAIN_ID });
    }
  }

  async function sendTx(label: string, send: () => Promise<Hex>): Promise<Hex> {
    setError(undefined);
    setStatus(`${label}…`);
    try {
      await ensureHedera();
      const sent = await send();
      if (!publicClient) throw new Error("Hedera RPC client is not ready");
      const mined = await publicClient.waitForTransactionReceipt({
        hash: sent,
        confirmations: 1,
        timeout: 180_000,
      });
      assertMinedSuccess(mined, sent);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auction", auctionRef] }),
        allowance.refetch(),
      ]);
      setStatus(`${label} confirmed`);
      return sent;
    } catch (err) {
      setStatus(undefined);
      throw err;
    }
  }

  const receiptLinks: ReceiptLink[] = [];
  if (associateHash) {
    receiptLinks.push({ label: "Associate", chain: "hedera", hash: associateHash });
  }
  if (receipt?.approveHash) {
    receiptLinks.push({ label: "Approve", chain: "hedera", hash: receipt.approveHash });
  }
  if (receipt?.bidHash) {
    receiptLinks.push({ label: "Bid", chain: "hedera", hash: receipt.bidHash });
  }

  return (
    <>
      <section className="card order-ticket">
        <div className="order-ticket__header">
          <div>
            <p className="market-phase market-phase--open">Order entry</p>
            <h2>Place bid</h2>
          </div>
          <span className="status-indicator">Hedera · USDC</span>
        </div>
        <NetworkGuard chainId={HEDERA_CHAIN_ID} />
        {!escrow ? (
          <p className="banner-warn order-ticket__gate">
            Hedera USDC escrow is not configured yet (`NEXT_PUBLIC_HEDERA_BID_ESCROW_ADDRESS`).
          </p>
        ) : null}
        {!isConnected ? <p className="banner-warn order-ticket__gate">Connect MetaMask to bid.</p> : null}
        {disabled && reason ? <p className="banner-bad order-ticket__gate">{reason}</p> : null}
        <div className="field order-ticket__amount">
          <label htmlFor="hedera-bid-amount">Amount (USDC)</label>
          <div className="order-ticket__input">
            <input
              id="hedera-bid-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled || !isConnected || !escrow}
              inputMode="decimal"
            />
            <span aria-hidden="true">USDC</span>
          </div>
        </div>
        <dl className="order-ticket__balances">
          <div>
            <dt>Allowance</dt>
            <dd className="data-value">{formatUsdc(currentAllowance)} USDC</dd>
          </div>
          <div>
            <dt>Wallet</dt>
            <dd className="data-value">{formatUsdc(balance.data ?? 0n)} USDC</dd>
          </div>
        </dl>
        <div className="order-ticket__actions">
          <button
            type="button"
            className="btn"
            disabled={formLocked || isPending}
            onClick={() => {
              sendTx("Associate", () =>
                writeContractAsync({
                  address: usdc,
                  abi: htsAssociateAbi,
                  functionName: "associate",
                  chainId: HEDERA_CHAIN_ID,
                  ...HEDERA_WALLET_TX,
                }),
              )
                .then(setAssociateHash)
                .catch(setError);
            }}
          >
            Associate USDC
          </button>
          <button
            type="button"
            className="btn"
            disabled={formLocked || !approveNeeded || isPending}
            onClick={() => {
              if (!escrow) return;
              sendTx("Approve", () =>
                writeContractAsync({
                  address: usdc,
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [escrow, parsed],
                  chainId: HEDERA_CHAIN_ID,
                  ...HEDERA_WALLET_TX,
                }),
              )
                .then(setApproveHash)
                .catch(setError);
            }}
          >
            Approve USDC
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={formLocked || approveNeeded || isPending}
            onClick={() => {
              if (!escrow) return;
              const escrowed = parsed;
              setStatus("Registering Hedera rail…");
              registerHederaRail(auctionRef)
                .then(() =>
                  sendTx("Bid", () =>
                    writeContractAsync({
                      address: escrow,
                      abi: bidEscrowAbi,
                      functionName: "placeBid",
                      args: [auctionRef, escrowed],
                      chainId: HEDERA_CHAIN_ID,
                      ...HEDERA_WALLET_TX,
                    }),
                  ),
                )
                .then((bidHash) => {
                  setReceipt({
                    associateHash,
                    approveHash,
                    bidHash,
                    escrowed,
                    onChainTotal: previousBid + escrowed,
                  });
                  setApproveHash(undefined);
                })
                .catch(setError);
            }}
          >
            Place bid
          </button>
        </div>
        <div aria-live="polite">
          <InlineStatus message={status} tone="ok" />
        </div>
        <TxError error={error} />
      </section>
      {receipt ? (
        <ActionReceipt
          title="Bid placed"
          summary={`Escrowed ${formatUsdc(receipt.escrowed)} USDC on Hedera for this lot`}
          details={[{ label: "Your bid", value: `${formatUsdc(receipt.onChainTotal)} USDC` }]}
          links={receiptLinks}
        />
      ) : null}
    </>
  );
}
