import { actorLabel } from "@/lib/addresses";
import { formatBondAmount, formatUsdc } from "@/lib/format";
import { isOutcomeStatus, outcomeHeadline, outcomeLabel, pickOutcomeLinks } from "@/lib/outcome";
import type { AuctionDetail } from "@/lib/types";
import { ActionReceipt, type ReceiptLink } from "./ActionReceipt";

export function OutcomeCard({ detail }: { detail: AuctionDetail }) {
  if (!isOutcomeStatus(detail.arcStatus)) return null;

  const links = pickOutcomeLinks(detail);
  const winnerLabel = detail.winner ? actorLabel(detail.winner) : undefined;
  const winnerValue = detail.winner
    ? winnerLabel
      ? `${winnerLabel} · ${detail.winner}`
      : detail.winner
    : undefined;
  const bonds = formatBondAmount(detail.amount, 0, detail.tokenSymbol || undefined);

  const rows: { label: string; value: string }[] = [
    { label: "Outcome", value: outcomeLabel(detail.arcStatus) },
  ];
  if (winnerValue) rows.push({ label: "Winner", value: winnerValue });
  if (detail.amount) rows.push({ label: "Bonds", value: bonds });
  if (detail.clearingPrice) {
    rows.push({ label: "Clearing price", value: `${formatUsdc(detail.clearingPrice)} USDC` });
  }

  const receiptLinks: ReceiptLink[] = [];
  if (links.awarded) {
    receiptLinks.push({ label: "Awarded", chain: "arc", hash: links.awarded });
  }
  if (detail.arcStatus === "Settled" && links.paid) {
    receiptLinks.push({ label: "Paid", chain: "arc", hash: links.paid });
  }
  if (links.hedera) {
    receiptLinks.push({ label: "Bonds delivered", chain: "hedera", hash: links.hedera });
  }

  return (
    <ActionReceipt
      title={outcomeHeadline(detail.arcStatus)}
      summary={
        detail.arcStatus === "Awarded"
          ? "Winner selected on Arc. Hedera delivery has not confirmed yet."
          : detail.arcStatus === "Settled"
            ? "Bonds delivered on Hedera and USDC released on Arc."
            : `Auction ended as ${outcomeLabel(detail.arcStatus)}.`
      }
      details={rows}
      links={receiptLinks}
    />
  );
}
