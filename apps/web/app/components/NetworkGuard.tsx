"use client";

import { ARC_CHAIN_ID, HEDERA_CHAIN_ID } from "@/lib/constants";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

const NAMES: Record<number, string> = {
  [HEDERA_CHAIN_ID]: "Hedera Testnet",
  [ARC_CHAIN_ID]: "Arc Testnet",
};

export function NetworkGuard({ chainId }: { chainId: typeof HEDERA_CHAIN_ID | typeof ARC_CHAIN_ID }) {
  const { isConnected } = useAccount();
  const current = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const name = NAMES[chainId] ?? `chain ${chainId}`;

  if (!isConnected || current === chainId) return null;

  return (
    <div className="banner-warn mb-4 flex items-center justify-between gap-3">
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
  if (!isConnected) return <span className="muted text-sm">Wallet not connected</span>;
  return <span className="text-sm font-semibold">{NAMES[chainId] ?? `Chain ${chainId}`}</span>;
}
