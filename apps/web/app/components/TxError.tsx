"use client";

import { useState } from "react";
import { decodeTxError } from "@/lib/decode-error";

export function TxError({ error }: { error: unknown }) {
  const [open, setOpen] = useState(false);
  if (!error) return null;
  const decoded = decodeTxError(error);
  const label = decoded.kind === "rpc" ? "RPC" : decoded.kind === "revert" ? "Reverted" : "Failed";

  return (
    <div className="banner-bad tx-error" role="alert">
      <div className="tx-error__summary">
        <p>
          {label}: <strong>{decoded.name}</strong>
          {decoded.name !== decoded.message ? ` — ${decoded.message}` : null}
        </p>
        {decoded.raw ? (
          <button
            type="button"
            className="tx-error__toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "hide details" : "details"}
          </button>
        ) : null}
      </div>
      {open && decoded.raw ? <pre className="hash tx-error__raw">{decoded.raw}</pre> : null}
    </div>
  );
}

export function InlineStatus({ message, tone = "muted" }: { message?: string | null; tone?: "muted" | "ok" | "bad" }) {
  if (!message) return null;
  const cls = tone === "ok" ? "banner-ok" : tone === "bad" ? "banner-bad" : "muted";
  return <p className={`${cls} inline-status`}>{message}</p>;
}
