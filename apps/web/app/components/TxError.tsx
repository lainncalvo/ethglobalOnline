"use client";

import { useState } from "react";
import { decodeTxError } from "@/lib/decode-error";

export function TxError({ error }: { error: unknown }) {
  const [open, setOpen] = useState(false);
  if (!error) return null;
  const decoded = decodeTxError(error);

  return (
    <div className="banner-bad mt-3">
      <div className="flex items-start justify-between gap-3">
        <p>
          Reverted: <strong>{decoded.name}</strong>
          {decoded.name !== decoded.message ? ` — ${decoded.message}` : null}
        </p>
        {decoded.raw ? (
          <button type="button" className="underline" onClick={() => setOpen((v) => !v)}>
            {open ? "hide details" : "details"}
          </button>
        ) : null}
      </div>
      {open && decoded.raw ? <pre className="hash mt-2 whitespace-pre-wrap break-all">{decoded.raw}</pre> : null}
    </div>
  );
}

export function InlineStatus({ message, tone = "muted" }: { message?: string | null; tone?: "muted" | "ok" | "bad" }) {
  if (!message) return null;
  const cls = tone === "ok" ? "banner-ok" : tone === "bad" ? "banner-bad" : "muted";
  return <p className={`${cls} mt-3`}>{message}</p>;
}
