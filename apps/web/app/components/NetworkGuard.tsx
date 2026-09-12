"use client";

import { ARC_CHAIN_ID, HEDERA_CHAIN_ID } from "@/lib/constants";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { StatusIndicator } from "./StatusIndicator";

const NAMES: Record<number, string> = {
  [HEDERA_CHAIN_ID]: "Hedera Testnet",
  [ARC_CHAIN_ID]: "Arc Testnet",
};

const SHORT_NAMES: Record<number, string> = {
  [HEDERA_CHAIN_ID]: "Hedera",
  [ARC_CHAIN_ID]: "Arc",
};

export function NetworkGuard({ chainId }: { chainId: typeof HEDERA_CHAIN_ID | typeof ARC_CHAIN_ID }) {
  const { isConnected } = useAccount();
  const current = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const name = NAMES[chainId] ?? `chain ${chainId}`;

  if (!isConnected || current === chainId) return null;

  return (
    <div className="banner-warn network-guard mb-4 flex items-center justify-between gap-3">
      <span>Switch to {name} to continue.</span>
      <button
        type="button"
        className="btn btn-primary"
        disabled={isPending}
        onClick={() => switchChain({ chainId })}
      >
        {isPending ? "Switching…" : `Switch to ${name}`}
      </button>
    </div>
  );
}

export function CurrentNetwork() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  if (!isConnected) {
    return <StatusIndicator label="Wallet offline" compactLabel="Offline" />;
  }

  const name = NAMES[chainId] ?? `Chain ${chainId}`;
  return (
    <StatusIndicator
      label={name}
      compactLabel={SHORT_NAMES[chainId] ?? String(chainId)}
      tone="positive"
    />
  );
}
