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
  if (!value) return <span>—</span>;
  const role = actorLabel(value);

  async function copy() {
    await navigator.clipboard.writeText(value!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <ExplorerLink chain={chain} address={value}>
        {shortAddress(value)}
      </ExplorerLink>
      {role ? <span className="text-sm font-semibold">({role})</span> : null}
      <button type="button" className="text-sm underline" onClick={copy}>
        {copied ? "copied" : "copy"}
      </button>
    </span>
  );
}
