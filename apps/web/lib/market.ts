import { deadlineUnix } from "./format";
import type { AuctionView } from "./types";

export type MarketFilter = "open" | "closed" | "all";
export type MarketPhase = "Open" | "Ended" | "Awarded" | "Settled" | "Cancelled" | "No winner" | "Expired" | "Voided";

export const MARKET_FILTERS: { id: MarketFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
];

export function marketPhase(
  auction: Pick<AuctionView, "arcStatus" | "hederaStatus" | "deadline">,
  nowMs: number = Date.now(),
): MarketPhase {
  if (auction.hederaStatus === "Cancelled" || auction.arcStatus === "Cancelled") return "Cancelled";
  if (auction.arcStatus === "Voided") return "Voided";
  if (auction.arcStatus === "Expired") return "Expired";
  if (auction.arcStatus === "NoWinner") return "No winner";
  if (auction.arcStatus === "Settled" || auction.hederaStatus === "Settled") return "Settled";
  if (auction.arcStatus === "Awarded") return "Awarded";
  if (deadlineUnix(auction.deadline) * 1000 <= nowMs) return "Ended";
  return "Open";
}

/** Live lot: still listed and the clock has not run out. */
export function isOpenAuction(
  auction: Pick<AuctionView, "arcStatus" | "hederaStatus" | "deadline">,
  nowMs: number = Date.now(),
): boolean {
  return marketPhase(auction, nowMs) === "Open";
}

export function filterAuctions<T extends Pick<AuctionView, "arcStatus" | "hederaStatus" | "deadline">>(
  auctions: T[],
  filter: MarketFilter,
  nowMs: number = Date.now(),
): T[] {
  if (filter === "all") return auctions;
  return auctions.filter((auction) => {
    const open = isOpenAuction(auction, nowMs);
    return filter === "open" ? open : !open;
  });
}
