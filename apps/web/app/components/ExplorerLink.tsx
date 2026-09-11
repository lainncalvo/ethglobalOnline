import { ARCSCAN_BASE, HASHSCAN_BASE } from "@/lib/constants";
import { shortAddress } from "@/lib/format";

export function explorerUrl(
  chain: "hedera" | "arc",
  value: string,
  kind: "tx" | "address" = "tx",
): string {
  if (chain === "hedera") {
    return kind === "tx" ? `${HASHSCAN_BASE}/transaction/${value}` : `${HASHSCAN_BASE}/address/${value}`;
  }
  return kind === "tx" ? `${ARCSCAN_BASE}/tx/${value}` : `${ARCSCAN_BASE}/address/${value}`;
}

export function ExplorerLink({
  chain,
  hash,
  address,
  children,
}: {
  chain: "hedera" | "arc";
  hash?: string;
  address?: string;
  children?: React.ReactNode;
}) {
  const target = hash ?? address;
  if (!target) return <span>—</span>;
  const href = explorerUrl(chain, target, hash ? "tx" : "address");
  return (
    <a href={href} target="_blank" rel="noreferrer" className="hash">
      {children ?? (hash ? shortAddress(hash) : shortAddress(target))}
    </a>
  );
}
