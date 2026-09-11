"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { bidEscrowAbi, erc20Abi } from "@/lib/abi";
import { ARC_CHAIN_ID, ARC_TX_FEES, USDC_DECIMALS } from "@/lib/constants";
import { formatUsdc, parseDecimalInput } from "@/lib/format";
import { NetworkGuard } from "./NetworkGuard";
import { ExplorerLink } from "./ExplorerLink";
import { InlineStatus, TxError } from "./TxError";

export function BidForm({
  auctionRef,
  escrow,
  usdc,
  disabled,
  reason,
}: {
  auctionRef: Hex;
  escrow?: Address;
  usdc: Address;
  disabled: boolean;
  reason?: string;
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("14500");
  const [hash, setHash] = useState<Hex>();
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState<string>();

  const allowance = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && escrow ? [address, escrow] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address && escrow), refetchInterval: 5_000 },
  });
  const balance = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 5_000 },
  });

  let parsed = 0n;
  try {
    parsed = parseDecimalInput(amount, USDC_DECIMALS);
  } catch {
    parsed = 0n;
  }
  const currentAllowance = allowance.data ?? 0n;
  const needsApprove = currentAllowance < parsed;
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID;
  const formLocked = disabled || !isConnected || !escrow || parsed <= 0n || wrongChain;

  async function ensureArc() {
    if (chainId !== ARC_CHAIN_ID) {
      await switchChainAsync({ chainId: ARC_CHAIN_ID });
    }
  }

  async function run(label: string, send: () => Promise<Hex>) {
    setError(undefined);
    setStatus(`${label}…`);
    await ensureArc();
    const sent = await send();
    setHash(sent);
    await publicClient?.waitForTransactionReceipt({ hash: sent, confirmations: 1, timeout: 180_000 });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["auction", auctionRef] }),
      allowance.refetch(),
    ]);
    setStatus(`${label} confirmed`);
  }

  return (
    <section className="card">
      <h2 className="mb-3">Place bid</h2>
      <NetworkGuard chainId={ARC_CHAIN_ID} />
      {!isConnected ? <p className="muted mb-3">Connect MetaMask to bid.</p> : null}
      {disabled && reason ? <p className="banner-bad mb-3">{reason}</p> : null}
      <div className="field mb-3">
        <label htmlFor="bid-amount">Amount (USDC)</label>
        <input
          id="bid-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={disabled || !isConnected}
          inputMode="decimal"
        />
      </div>
      <p className="muted mb-3">
        Allowance {formatUsdc(currentAllowance)} USDC · wallet {formatUsdc(balance.data ?? 0n)} USDC
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          disabled={formLocked || !needsApprove || isPending}
          onClick={() => {
            if (!escrow) return;
            run("Approve", () =>
              writeContractAsync({
                address: usdc,
                abi: erc20Abi,
                functionName: "approve",
                args: [escrow, parsed],
                chainId: ARC_CHAIN_ID,
                ...ARC_TX_FEES,
              }),
            ).catch(setError);
          }}
        >
          Approve USDC
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={formLocked || needsApprove || isPending}
          onClick={() => {
            if (!escrow) return;
            run("Bid", () =>
              writeContractAsync({
                address: escrow,
                abi: bidEscrowAbi,
                functionName: "placeBid",
                args: [auctionRef, parsed],
                chainId: ARC_CHAIN_ID,
                ...ARC_TX_FEES,
              }),
            ).catch(setError);
          }}
        >
          Place bid
        </button>
      </div>
      <InlineStatus message={status} tone="ok" />
      {hash ? (
        <p className="mt-2">
          <ExplorerLink chain="arc" hash={hash} />
        </p>
      ) : null}
      <TxError error={error} />
    </section>
  );
}
