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
    <tr>
      <td className="hash">{auction.hederaAuctionId}</td>
      <td>
        {auction.tokenSymbol}
        <div className="muted text-sm">
          H {auction.hederaStatus} · A {auction.arcStatus}
        </div>
      </td>
      <td>
        <Address value={auction.seller} />
      </td>
      <td>{auction.topBid ? <UsdcAmount value={auction.topBid} /> : "—"}</td>
      <td>
        <div className="flex flex-wrap gap-2">
          {auction.arcStatus === "None" ? (
            <button
              type="button"
              className="btn"
              disabled={Boolean(busy)}
              onClick={() => run("register", () => registerAuction(auction.hederaAuctionId))}
            >
              Register
            </button>
          ) : null}
          <button
            type="button"
            className="btn"
            disabled={Boolean(busy)}
            onClick={() => run("close", () => closeAuction(auction.ref, token))}
          >
            Close
          </button>
          <button
            type="button"
            className="btn"
            disabled={Boolean(busy) || !to}
            onClick={() => run("settle-preview", () => settlePreview(auction.ref, to, token))}
          >
            Preview
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={Boolean(busy)}
            onClick={() => run("settle", () => settleAuction(auction.ref, token))}
          >
            Settle
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={Boolean(busy) || !reason}
            onClick={() => run("void", () => voidAuction(auction.ref, reason, token))}
          >
            Void
          </button>
          <button
            type="button"
            className="btn"
            disabled={Boolean(busy)}
            onClick={() => run("cancel", () => cancelAuction(auction.ref, token))}
          >
            Cancel
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input placeholder="preview to (Buyer C)" value={to} onChange={(e) => setTo(e.target.value)} />
          <input placeholder="void reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </td>
    </tr>
  );
}
