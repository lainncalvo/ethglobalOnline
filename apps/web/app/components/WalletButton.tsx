"use client";

import { actorLabel } from "@/lib/addresses";
import { shortAddress } from "@/lib/format";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { DisconnectIcon } from "./Icons";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const injected = connectors.find((c) => c.id === "injected" || c.type === "injected") ?? connectors[0];
  const role = actorLabel(address);

  if (!isConnected || !address) {
    return (
      <div className="wallet-button">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!injected || isPending}
          onClick={() => injected && connect({ connector: injected })}
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error ? (
          <span className="wallet-button__error" role="alert" title={error.message}>
            {error.message}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="wallet-button">
      {role ? <span className="wallet-button__role">{role}</span> : null}
      <span className="hash wallet-button__address" title={address}>
        {shortAddress(address)}
      </span>
      <button
        type="button"
        className="btn wallet-button__disconnect"
        aria-label="Disconnect wallet"
        title="Disconnect wallet"
        onClick={() => disconnect()}
      >
        <DisconnectIcon className="wallet-button__icon" />
        <span className="wallet-button__disconnect-label">Disconnect</span>
      </button>
    </div>
  );
}
