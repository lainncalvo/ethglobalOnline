"use client";

import { useEffect, useRef, useState } from "react";
import { actorLabel } from "@/lib/addresses";
import { shortAddress } from "@/lib/format";
import { ExplorerLink } from "./ExplorerLink";

export function Address({
  value,
  chain = "hedera",
}: {
  value?: string | null;
  chain?: "hedera" | "arc";
}) {
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAttemptRef = useRef(0);

  useEffect(() => {
    return () => {
      copyAttemptRef.current += 1;
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  if (!value) return <span className="data-value">—</span>;
  const role = actorLabel(value);

  async function copy() {
    const attempt = ++copyAttemptRef.current;
    try {
      await navigator.clipboard.writeText(value!);
      if (attempt !== copyAttemptRef.current) return;

      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      setCopied(true);
      copyResetTimerRef.current = setTimeout(() => {
        if (attempt === copyAttemptRef.current) setCopied(false);
        copyResetTimerRef.current = null;
      }, 1200);
    } catch {
      if (attempt !== copyAttemptRef.current) return;
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = null;
      setCopied(false);
    }
  }

  return (
    <span className="data-address">
      <ExplorerLink chain={chain} address={value}>
        {shortAddress(value)}
      </ExplorerLink>
      {role ? <span className="data-address__role">({role})</span> : null}
      <button
        type="button"
        className="data-address__copy"
        aria-label={copied ? `Copied ${value}` : `Copy ${value}`}
        onClick={copy}
      >
        {copied ? "copied" : "copy"}
      </button>
    </span>
  );
}
