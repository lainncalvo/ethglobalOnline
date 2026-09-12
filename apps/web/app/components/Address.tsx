"use client";

import { useState } from "react";
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
  if (!value) return <span className="data-value">—</span>;
  const role = actorLabel(value);

  async function copy() {
    await navigator.clipboard.writeText(value!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
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
