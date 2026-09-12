"use client";

import { useState } from "react";
import {
  cancelAuction,
  closeAuction,
  registerAuction,
  settleAuction,
  settlePreview,
  voidAuction,
} from "@/lib/api";
import type { AuctionView } from "@/lib/types";
import { Address } from "./Address";
import { UsdcAmount } from "./Amount";
import type { LogEntry } from "./LogPane";

export function OperatorRow({
  auction,
  token,
  onLog,
}: {
  auction: AuctionView;
  token: string;
  onLog: (entry: LogEntry) => void;
}) {
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string>();

  async function run(action: string, fn: () => Promise<unknown>) {
    setBusy(action);
    try {
      const body = await fn();
      onLog({ at: new Date().toISOString(), action: `${action} ${auction.ref}`, body });
    } catch (error) {
      onLog({
        at: new Date().toISOString(),
        action: `${action} ${auction.ref} failed`,
        body: { error: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <tr className="operator-lot" data-arc-status={auction.arcStatus}>
      <td className="operator-lot__id" data-label="Id">
        <span className="hash">{auction.hederaAuctionId}</span>
      </td>
      <td className="operator-lot__status" data-label="Status">
        <strong>{auction.tokenSymbol}</strong>
        <div className="operator-lot__phase">
          H {auction.hederaStatus} · A {auction.arcStatus}
        </div>
      </td>
      <td className="operator-lot__seller" data-label="Seller">
        <Address value={auction.seller} />
      </td>
      <td className="operator-lot__bid" data-label="Top bid">
        {auction.topBid ? <UsdcAmount value={auction.topBid} /> : "—"}
      </td>
      <td className="operator-lot__console" data-label="Actions">
        <div
          className="operator-actions"
          role="group"
          aria-label={`Actions for auction ${auction.hederaAuctionId}`}
        >
          {auction.arcStatus === "None" ? (
            <button
              type="button"
              className="btn operator-actions__button"
              disabled={Boolean(busy)}
              onClick={() => run("register", () => registerAuction(auction.hederaAuctionId))}
            >
              Register
            </button>
          ) : null}
          <button
            type="button"
            className="btn operator-actions__button"
            disabled={Boolean(busy)}
            onClick={() => run("close", () => closeAuction(auction.ref, token))}
          >
            Close
          </button>
          <button
            type="button"
            className="btn operator-actions__button"
            disabled={Boolean(busy) || !to}
            onClick={() => run("settle-preview", () => settlePreview(auction.ref, to, token))}
          >
            Preview
          </button>
          <button
            type="button"
            className="btn btn-primary operator-actions__button"
            disabled={Boolean(busy)}
            onClick={() => run("settle", () => settleAuction(auction.ref, token))}
          >
            Settle
          </button>
          <button
            type="button"
            className="btn btn-danger operator-actions__button"
            disabled={Boolean(busy) || !reason}
            onClick={() => run("void", () => voidAuction(auction.ref, reason, token))}
          >
            Void
          </button>
          <button
            type="button"
            className="btn operator-actions__button"
            disabled={Boolean(busy)}
            onClick={() => run("cancel", () => cancelAuction(auction.ref, token))}
          >
            Cancel
          </button>
        </div>
        <div className="operator-actions__inputs">
          <div className="field">
            <label htmlFor={`preview-to-${auction.hederaAuctionId}`}>Preview recipient</label>
            <input
              id={`preview-to-${auction.hederaAuctionId}`}
              placeholder="preview to (Buyer C)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={`void-reason-${auction.hederaAuctionId}`}>Void reason</label>
            <input
              id={`void-reason-${auction.hederaAuctionId}`}
              placeholder="void reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <span className="operator-actions__pending" role="status" aria-live="polite">
          {busy ? `Running ${busy}…` : null}
        </span>
      </td>
    </tr>
  );
}
