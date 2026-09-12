"use client";

import { useState } from "react";
import {
  cancelHederaRail,
  closeHederaRail,
  registerHederaRail,
  settleHederaRail,
} from "@/lib/hedera-api";
import type { AuctionView } from "@/lib/types";
import type { LogEntry } from "./LogPane";

export function HederaOperatorActions({
  auctions,
  token,
  onLog,
}: {
  auctions: AuctionView[];
  token: string;
  onLog: (entry: LogEntry) => void;
}) {
  const [busy, setBusy] = useState<string>();

  async function run(action: string, ref: string, fn: () => Promise<unknown>) {
    setBusy(`${action}:${ref}`);
    try {
      const body = await fn();
      onLog({ at: new Date().toISOString(), action: `${action} ${ref}`, body });
    } catch (error) {
      onLog({
        at: new Date().toISOString(),
        action: `${action} ${ref} failed`,
        body: { error: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section className="card operator-lots" aria-labelledby="hedera-rail-title">
      <header className="operator-section-heading">
        <div>
          <p className="operator-eyebrow">Hedera USDC rail</p>
          <h2 id="hedera-rail-title">Hedera escrow actions</h2>
        </div>
      </header>
      <p className="muted">
        Existing Close / Settle buttons above still run Arc + CRE. Use these only for the Hedera USDC cash leg.
      </p>
      {auctions.length === 0 ? (
        <p className="muted">No auctions.</p>
      ) : (
        <ul className="operator-actions" style={{ flexWrap: "wrap", listStyle: "none", padding: 0 }}>
          {auctions.map((auction) => (
            <li key={auction.ref} className="operator-lot" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <span className="hash">{auction.hederaAuctionId} · {auction.tokenSymbol}</span>
              <div className="operator-actions" role="group" aria-label={`Hedera rail for ${auction.hederaAuctionId}`}>
                <button
                  type="button"
                  className="btn operator-actions__button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    run("hedera-register", auction.ref, () => registerHederaRail(auction.ref))
                  }
                >
                  Register Hedera
                </button>
                <button
                  type="button"
                  className="btn operator-actions__button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    run("hedera-close", auction.ref, () => closeHederaRail(auction.ref, token))
                  }
                >
                  Close Hedera
                </button>
                <button
                  type="button"
                  className="btn btn-primary operator-actions__button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    run("hedera-settle", auction.ref, () => settleHederaRail(auction.ref, token))
                  }
                >
                  Settle Hedera
                </button>
                <button
                  type="button"
                  className="btn operator-actions__button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    run("hedera-cancel", auction.ref, () => cancelHederaRail(auction.ref, token))
                  }
                >
                  Cancel Hedera
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <span className="operator-actions__pending" role="status" aria-live="polite">
        {busy ? `Running ${busy}…` : null}
      </span>
    </section>
  );
}
