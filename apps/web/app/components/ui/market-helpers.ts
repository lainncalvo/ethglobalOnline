import type { MarketFilter } from "@/lib/market";

const MARKET_FILTER_ORDER: MarketFilter[] = ["open", "closed", "all"];

export function marketFilterForKey(
  currentFilter: MarketFilter,
  key: string,
): MarketFilter | null {
  if (key === "Home") return MARKET_FILTER_ORDER[0];
  if (key === "End") return MARKET_FILTER_ORDER.at(-1) ?? null;
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null;

  const currentIndex = MARKET_FILTER_ORDER.indexOf(currentFilter);
  const offset = key === "ArrowRight" ? 1 : -1;
  const nextIndex =
    (currentIndex + offset + MARKET_FILTER_ORDER.length) %
    MARKET_FILTER_ORDER.length;
  return MARKET_FILTER_ORDER[nextIndex];
}

export function shouldRunCountdownTimer(
  deadlineUnix: number,
  nowUnix: number,
  hasSharedClock: boolean,
): boolean {
  return !hasSharedClock && deadlineUnix > nowUnix;
}
