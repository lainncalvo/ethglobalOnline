"use client";

import { actorLabel } from "@/lib/addresses";
import { shortAddress } from "@/lib/format";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const injected = connectors.find((c) => c.id === "injected" || c.type === "injected") ?? connectors[0];
  const role = actorLabel(address);

  if (!isConnected || !address) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!injected || isPending}
          onClick={() => injected && connect({ connector: injected })}
        >
          {isPending ? "Connecting…" : "Connect MetaMask"}
        </button>
        {error ? <span className="text-sm text-[var(--bad)]">{error.message}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {role ? (
        <span className="border border-[var(--line)] bg-white px-2 py-1 text-sm font-semibold">{role}</span>
      ) : null}
      <span className="hash" title={address}>
        {shortAddress(address)}
      </span>
      <button type="button" className="btn" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
