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
    <section className="card settlement-timeline">
      <div className="section-heading">
        <div>
          <p className="market-phase">Cross-chain lifecycle</p>
          <h2>Settlement</h2>
        </div>
        <p className="hash muted">Hedera → Arc</p>
      </div>
      <div
        className="settlement-timeline__scroll"
        role="region"
        aria-label="Settlement progress"
        tabIndex={0}
      >
        <ol className="settlement-timeline__track">
          {NODES.map((node, index) => {
            const active = reached(detail, node.id);
            const entry = entryFor(detail, node.match);
            return (
              <li
                key={node.id}
                className="settlement-timeline__step"
                data-state={active ? "reached" : "waiting"}
                aria-label={`${node.label}: ${active ? "reached" : "waiting"}`}
              >
                <span className="settlement-timeline__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="settlement-timeline__label">{node.label}</p>
                <p className="market-phase">
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
      </div>
      {terminal ? (
        <p className="banner-bad settlement-timeline__result">
          Terminal: {detail.arcStatus}
          {detail.hederaStatus === "Cancelled" ? " · Hedera Cancelled" : ""}
        </p>
      ) : null}
      {detail.arcStatus === "Awarded" && detail.winner ? (
        <p className="banner-ok settlement-timeline__result">Winner {detail.winner} · source {detail.awardSource}</p>
      ) : null}
      {detail.arcStatus === "Settled" && detail.hederaTxHash ? (
        <p className="banner-ok settlement-timeline__result">
          Delivered · <ExplorerLink chain="hedera" hash={detail.hederaTxHash} />
        </p>
      ) : null}
    </section>
  );
}
