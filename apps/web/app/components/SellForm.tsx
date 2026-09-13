"use client";

import { useMemo, useState } from "react";
import { isAddress, type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { atsBondAbi, exitAuctionAbi } from "@/lib/abi";
import { getPublicAddresses } from "@/lib/addresses";
import { postReserve, registerAuction } from "@/lib/api";
import {
  DEFAULT_PARTITION,
  DEMO_AMOUNT,
  DEMO_RESERVE_USDC,
  HEDERA_CHAIN_ID,
  HEDERA_WALLET_TX,
  HOLD_BUFFER_SECONDS,
  MIN_AUCTION_DURATION_SECONDS,
  SETTLE_GRACE_SECONDS,
  USDC_DECIMALS,
  ZERO_ADDRESS,
} from "@/lib/constants";
import { formatBondAmount, parseDecimalInput, toDatetimeLocal } from "@/lib/format";
import type { TxStep } from "@/lib/types";
import { sleep, withRpcRetry } from "@/lib/rpc-retry";
import { auctionCreatedFromReceipt, computeCommitment, holdIdFromReceipt, randomSalt } from "@/lib/tx";
import { ListingOverview } from "./ListingOverview";
import { ListingComplete, ListingProgress } from "./ListingStatus";
import { NetworkGuard } from "./NetworkGuard";
import { TxError } from "./TxError";

const idle: TxStep[] = [
  { id: "hold", label: "Create ATS hold", status: "idle", chain: "hedera" },
  { id: "auction", label: "Register auction on Hedera", status: "idle", chain: "hedera" },
  { id: "mirror", label: "Mirror on Arc (POST /api/auctions)", status: "idle", chain: "arc" },
  { id: "reserve", label: "Store sealed reserve", status: "idle" },
];

export function SellForm() {
  const addresses = getPublicAddresses();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: HEDERA_CHAIN_ID });

  const [token, setToken] = useState(addresses.bondToken ?? "");
  const [amount, setAmount] = useState(DEMO_AMOUNT);
  const [reserve, setReserve] = useState(DEMO_RESERVE_USDC);
  const [deadline, setDeadline] = useState(() =>
    toDatetimeLocal(new Date(Date.now() + 10 * 60 * 1000)),
  );
  const [salt] = useState<Hex>(() => randomSalt());
  const [copied, setCopied] = useState(false);
  const [steps, setSteps] = useState<TxStep[]>(idle);
  const [result, setResult] = useState<{ ref: Hex; id: string; holdHash?: Hex; auctionHash?: Hex; arcTxHash?: string }>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const tokenAddress = isAddress(token) ? (token as Address) : undefined;
  const reads = useReadContracts({
    contracts: tokenAddress
      ? [
          { address: tokenAddress, abi: atsBondAbi, functionName: "decimals", chainId: HEDERA_CHAIN_ID },
          { address: tokenAddress, abi: atsBondAbi, functionName: "symbol", chainId: HEDERA_CHAIN_ID },
          {
            address: tokenAddress,
            abi: atsBondAbi,
            functionName: "balanceOf",
            args: address ? [address] : undefined,
            chainId: HEDERA_CHAIN_ID,
          },
          {
            address: tokenAddress,
            abi: atsBondAbi,
            functionName: "getHeldAmountFor",
            args: address ? [address] : undefined,
            chainId: HEDERA_CHAIN_ID,
          },
        ]
      : [],
    query: {
      enabled: Boolean(tokenAddress && address) && !busy,
      refetchInterval: busy ? false : 15_000,
    },
  });

  const decimals = reads.data?.[0]?.status === "success" ? Number(reads.data[0].result) : 0;
  const symbol = reads.data?.[1]?.status === "success" ? String(reads.data[1].result) : "";
  const available = reads.data?.[2]?.status === "success" ? reads.data[2].result : 0n;
  const held = reads.data?.[3]?.status === "success" ? reads.data[3].result : 0n;

  const canWrite = isConnected && tokenAddress && addresses.exitAuction && !busy;

  function patch(id: string, update: Partial<TxStep>) {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...update } : step)));
  }

  async function ensureHedera() {
    if (chainId !== HEDERA_CHAIN_ID) {
      await switchChainAsync({ chainId: HEDERA_CHAIN_ID });
    }
  }

  async function wait(hash: Hex) {
    if (!publicClient) throw new Error("Hedera client unavailable");
    return publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  }

  const reserve6 = useMemo(() => {
    try {
      return parseDecimalInput(reserve, USDC_DECIMALS);
    } catch {
      return 0n;
    }
  }, [reserve]);

  async function runMirror(id: string, ref: Hex) {
    patch("mirror", { status: "pending", error: undefined });
    try {
      const registered = await registerAuction(id);
      patch("mirror", { status: "done", hash: registered.arcTxHash as Hex | undefined });
      patch("reserve", { status: "pending" });
      await postReserve(registered.ref ?? ref, reserve6.toString(), salt);
      patch("reserve", { status: "done" });
      setResult((prev) => ({
        ref: (registered.ref as Hex) ?? ref,
        id,
        holdHash: prev?.holdHash,
        auctionHash: prev?.auctionHash,
        arcTxHash: registered.arcTxHash,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      patch("mirror", { status: "error", error: message });
      throw err;
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!tokenAddress || !addresses.exitAuction || !address || !publicClient) return;
    setError(undefined);
    setBusy(true);
    setSteps(idle);
    try {
      const amountBase = parseDecimalInput(amount, decimals);
      const deadlineUnix = Math.floor(new Date(deadline).getTime() / 1000);
      if (deadlineUnix < Math.floor(Date.now() / 1000) + MIN_AUCTION_DURATION_SECONDS) {
        throw new Error("Deadline must be at least 2 minutes from now");
      }
      const expiration = BigInt(deadlineUnix + SETTLE_GRACE_SECONDS + HOLD_BUFFER_SECONDS);
      const commitment = computeCommitment(reserve6, salt);
      if (amountBase > available) {
        throw new Error("Amount exceeds available (unheld) balance");
      }

      await ensureHedera();
      await sleep(1_500);
      patch("hold", { status: "pending" });
      const holdHash = await withRpcRetry(
        () =>
          writeContractAsync({
            address: tokenAddress,
            abi: atsBondAbi,
            functionName: "createHoldByPartition",
            args: [
              DEFAULT_PARTITION,
              {
                amount: amountBase,
                expirationTimestamp: expiration,
                escrow: addresses.exitAuction,
                to: ZERO_ADDRESS,
                data: "0x",
              },
            ],
            chainId: HEDERA_CHAIN_ID,
            ...HEDERA_WALLET_TX,
          }),
        (attempt, waitMs) => {
          patch("hold", {
            error: `Hashio rate limited. Retry ${attempt} in ${waitMs / 1000}s — confirm MetaMask again.`,
          });
        },
      );
      patch("hold", { hash: holdHash, error: undefined });
      const holdReceipt = await wait(holdHash);
      const holdId = holdIdFromReceipt(holdReceipt);
      patch("hold", { status: "done" });

      patch("auction", { status: "pending" });
      const auctionHash = await withRpcRetry(
        () =>
          writeContractAsync({
            address: addresses.exitAuction,
            abi: exitAuctionAbi,
            functionName: "createAuction",
            args: [tokenAddress, DEFAULT_PARTITION, holdId, amountBase, BigInt(deadlineUnix), commitment],
            chainId: HEDERA_CHAIN_ID,
            ...HEDERA_WALLET_TX,
          }),
        (attempt, waitMs) => {
          patch("auction", {
            error: `Hashio rate limited. Retry ${attempt} in ${waitMs / 1000}s — confirm MetaMask again.`,
          });
        },
      );
      patch("auction", { hash: auctionHash, error: undefined });
      const auctionReceipt = await wait(auctionHash);
      const created = auctionCreatedFromReceipt(auctionReceipt);
      patch("auction", { status: "done" });
      setResult({ ref: created.ref, id: created.id.toString(), holdHash, auctionHash });
      await runMirror(created.id.toString(), created.ref);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sell-workspace workspace-main">
      <header className="sell-workspace__header">
        <p className="market-phase market-phase--open">Primary order entry</p>
        <h1>List an exit auction</h1>
        <p className="muted">Hedera hold + sealed reserve. Demo lot: 10 bonds, 14,000 USDC.</p>
      </header>

      <div className="sell-workspace__grid">
        <ListingOverview amount={amount} reserve={reserve} deadline={deadline} symbol={symbol} />
        <div className="listing-workflow">
          <NetworkGuard chainId={HEDERA_CHAIN_ID} />
          {!isConnected ? <p className="banner-warn">Connect MetaMask to list.</p> : null}
          {!addresses.exitAuction || !addresses.bondToken ? (
            <p className="banner-warn">Bond / ExitAuction addresses pending L1–L2 deploy. Form is ready with demo defaults.</p>
          ) : null}

          <form className="card listing-form" onSubmit={onSubmit}>
            <div className="section-heading">
              <div>
                <p className="market-phase">Auction mandate</p>
                <h2>Listing terms</h2>
              </div>
              <span className="status-indicator">Hedera</span>
            </div>
            <div className="field listing-form__token">
              <label htmlFor="token">Token address</label>
              <input id="token" value={token} onChange={(e) => setToken(e.target.value)} className="hash" />
              {token && !tokenAddress ? <p className="listing-form__validation" role="alert">Enter a valid token address.</p> : null}
            </div>
            <div className="listing-form__fields">
              <div className="field">
                <label htmlFor="amount">Amount (bonds)</label>
                <input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <p className="muted text-sm">
                  Available {formatBondAmount(available, decimals, symbol)} / held {formatBondAmount(held, decimals, symbol)}
                </p>
              </div>
              <div className="field">
                <label htmlFor="reserve">Reserve (USDC)</label>
                <input id="reserve" value={reserve} onChange={(e) => setReserve(e.target.value)} inputMode="decimal" />
                <p className="muted text-sm">Stored as a sealed commitment.</p>
              </div>
              <div className="field">
                <label htmlFor="deadline">Deadline</label>
                <input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  min={toDatetimeLocal(new Date(Date.now() + MIN_AUCTION_DURATION_SECONDS * 1000))}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="field listing-form__salt">
                <label>Salt (shown once)</label>
                <div className="listing-form__salt-input">
                  <input readOnly value={salt} className="hash" />
                  <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                      await navigator.clipboard.writeText(salt);
                      setCopied(true);
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="listing-form__warning">
                  If you lose this salt the auction cannot be awarded; the app stores it server-side for the demo.
                </p>
              </div>
            </div>
            <div className="listing-form__submit">
              <button type="submit" className="btn btn-primary" disabled={!canWrite || chainId !== HEDERA_CHAIN_ID && isConnected}>
                {busy ? "Working…" : "Create auction"}
              </button>
              <p className="muted text-sm">Creates two on-chain transactions, then mirrors the auction on Arc.</p>
            </div>
          </form>

          <ListingProgress steps={steps} />
        </div>
      </div>
      <TxError error={error} />

      {steps[2]?.status === "error" && result?.id ? (
        <button
          type="button"
          className="btn mt-3"
          onClick={() => runMirror(result.id, result.ref).catch(setError)}
        >
          Retry registration
        </button>
      ) : null}

      {result && steps.every((s) => s.status === "done") ? (
        <ListingComplete result={result} />
      ) : null}
    </main>
  );
}
