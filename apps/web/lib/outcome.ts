import { isTxHash } from "./format";
import type { ArcStatus, AuctionDetail, TimelineEntry } from "./types";

const OUTCOME_STATUSES = new Set<ArcStatus>([
  "Awarded",
  "Settled",
  "NoWinner",
  "Voided",
  "Cancelled",
  "Expired",
]);

const LISTING_STEPS = ["listed", "hold", "held", "heldbypartition"];
const AWARDED_STEPS = ["awarded"];
const PAID_STEPS = ["delivery-confirmed", "paid"];
const SETTLED_STEPS = ["settled"];
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

function usableHash(value: string | null | undefined): value is string {
  return Boolean(value && isTxHash(value) && value.toLowerCase() !== ZERO_HASH);
}

function findStepHash(timeline: TimelineEntry[], steps: string[]): string | undefined {
  const wanted = new Set(steps.map((step) => step.toLowerCase()));
  for (const item of timeline) {
    if (wanted.has(item.step.toLowerCase()) && usableHash(item.txHash)) {
      return item.txHash;
    }
  }
  return undefined;
}

export function pickListingHash(timeline: TimelineEntry[]): string | undefined {
  return findStepHash(timeline, LISTING_STEPS);
}

export type OutcomeLinks = {
  awarded?: string;
  paid?: string;
  hedera?: string;
};

/** Award / paid Arc hashes from the timeline; Hedera settle from `hederaTxHash` or timeline. */
export function pickOutcomeLinks(
  detail: Pick<AuctionDetail, "timeline" | "hederaTxHash">,
): OutcomeLinks {
  const awarded = findStepHash(detail.timeline, AWARDED_STEPS);
  const paid = findStepHash(detail.timeline, PAID_STEPS);
  const settled = findStepHash(detail.timeline, SETTLED_STEPS);
  const hedera = usableHash(detail.hederaTxHash) ? detail.hederaTxHash : settled;
  return { awarded, paid, hedera };
}

export function isOutcomeStatus(status: ArcStatus): boolean {
  return OUTCOME_STATUSES.has(status);
}

export function outcomeLabel(status: ArcStatus): string {
  if (status === "NoWinner") return "No winner";
  return status;
}

export function outcomeHeadline(status: ArcStatus): string {
  if (status === "Awarded") return "Winner selected — delivery pending";
  if (status === "Settled") return "Auction settled";
  if (status === "NoWinner") return "No winner";
  return outcomeLabel(status);
}
