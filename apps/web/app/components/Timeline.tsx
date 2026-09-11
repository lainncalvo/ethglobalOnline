import { TERMINAL_ARC } from "@/lib/constants";
import type { AuctionDetail } from "@/lib/types";
import { ExplorerLink } from "./ExplorerLink";

const NODES = [
  { id: "listed", label: "Listed", chain: "hedera" as const, match: ["listed"] },
  { id: "bidding", label: "Bidding", chain: "arc" as const, match: ["registered", "bidding"] },
  { id: "awarded", label: "Awarded", chain: "arc" as const, match: ["awarded"] },
  { id: "delivered", label: "Delivered", chain: "hedera" as const, match: ["delivered", "holdbypartitionexecuted"] },
  { id: "paid", label: "Paid", chain: "arc" as const, match: ["paid", "deliveryconfirmed", "settled"] },
];

function entryFor(detail: AuctionDetail, match: string[]) {
  return detail.timeline.find((item) => match.includes(item.step.toLowerCase()));
}

function reached(detail: AuctionDetail, id: string): boolean {
  if (id === "listed") return true;
  if (id === "bidding") return detail.arcStatus !== "None";
  if (id === "awarded") {
    return ["Awarded", "Settled", ...TERMINAL_ARC].includes(detail.arcStatus) && detail.arcStatus !== "Cancelled";
  }
  if (id === "delivered") return detail.hederaStatus === "Settled" || Boolean(detail.hederaTxHash);
  if (id === "paid") return detail.arcStatus === "Settled";
  return false;
}

export function Timeline({ detail }: { detail: AuctionDetail }) {
  const terminal = TERMINAL_ARC.has(detail.arcStatus) && detail.arcStatus !== "Settled";

  return (
    <section className="card">
      <h2 className="mb-3">Settlement</h2>
      <ol className="grid grid-cols-5 gap-2">
        {NODES.map((node) => {
          const active = reached(detail, node.id);
          const entry = entryFor(detail, node.match);
          return (
            <li key={node.id} className={`border p-2 ${active ? "border-[var(--ok)] bg-[var(--ok-bg)]" : "border-[#ccc]"}`}>
              <p className="font-semibold">{node.label}</p>
              <p className="muted text-sm">
                {node.id === "awarded" && detail.awardSource !== "None" ? detail.awardSource : node.chain}
              </p>
              {entry?.txHash ? <ExplorerLink chain={entry.chain} hash={entry.txHash} /> : null}
              {node.id === "delivered" && !entry?.txHash && detail.hederaTxHash ? (
                <ExplorerLink chain="hedera" hash={detail.hederaTxHash} />
              ) : null}
            </li>
          );
        })}
      </ol>
      {terminal ? (
        <p className="banner-bad mt-3">
          Terminal: {detail.arcStatus}
          {detail.hederaStatus === "Cancelled" ? " · Hedera Cancelled" : ""}
        </p>
      ) : null}
      {detail.arcStatus === "Awarded" && detail.winner ? (
        <p className="banner-ok mt-3">Winner {detail.winner} · source {detail.awardSource}</p>
      ) : null}
      {detail.arcStatus === "Settled" && detail.hederaTxHash ? (
        <p className="banner-ok mt-3">
          Delivered · <ExplorerLink chain="hedera" hash={detail.hederaTxHash} />
        </p>
      ) : null}
    </section>
  );
}
