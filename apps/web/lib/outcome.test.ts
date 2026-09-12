import { describe, expect, test } from "bun:test";
import { DEMO_WALLETS } from "./constants";
import { MOCK_DETAIL } from "./mock";
import {
  isOutcomeStatus,
  outcomeHeadline,
  outcomeLabel,
  pickListingHash,
  pickOutcomeLinks,
} from "./outcome";
import type { AuctionDetail, TimelineEntry } from "./types";

const AWARD =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PAID =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SETTLE =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const LISTED =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const HEDERA_FIELD =
  "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

function detail(overrides: Partial<AuctionDetail> & { timeline: TimelineEntry[] }): AuctionDetail {
  return {
    ...MOCK_DETAIL,
    winner: DEMO_WALLETS.buyerB,
    clearingPrice: "2000000",
    ...overrides,
  };
}

describe("pickOutcomeLinks", () => {
  test("reads awarded from the timeline and leaves settle empty", () => {
    const links = pickOutcomeLinks(
      detail({
        hederaTxHash: null,
        timeline: [
          { step: "listed", chain: "hedera", txHash: LISTED, at: "2026-09-11T00:00:00.000Z" },
          { step: "awarded", chain: "arc", txHash: AWARD, at: "2026-09-11T01:00:00.000Z" },
        ],
      }),
    );
    expect(links).toEqual({ awarded: AWARD, paid: undefined, hedera: undefined });
  });

  test("prefers hederaTxHash and includes delivery-confirmed as paid", () => {
    const links = pickOutcomeLinks(
      detail({
        hederaTxHash: HEDERA_FIELD,
        timeline: [
          { step: "awarded", chain: "arc", txHash: AWARD, at: "2026-09-11T01:00:00.000Z" },
          { step: "settled", chain: "hedera", txHash: SETTLE, at: "2026-09-11T01:05:00.000Z" },
          {
            step: "delivery-confirmed",
            chain: "arc",
            txHash: PAID,
            at: "2026-09-11T01:06:00.000Z",
          },
        ],
      }),
    );
    expect(links).toEqual({ awarded: AWARD, paid: PAID, hedera: HEDERA_FIELD });
  });

  test("falls back to timeline settled when hederaTxHash is missing", () => {
    const links = pickOutcomeLinks(
      detail({
        hederaTxHash: null,
        timeline: [{ step: "settled", chain: "hedera", txHash: SETTLE, at: "2026-09-11T01:05:00.000Z" }],
      }),
    );
    expect(links.hedera).toBe(SETTLE);
  });

  test("ignores short or zero hashes", () => {
    const links = pickOutcomeLinks(
      detail({
        hederaTxHash: "0x0",
        timeline: [
          { step: "awarded", chain: "arc", txHash: "0x1", at: "2026-09-11T01:00:00.000Z" },
          {
            step: "settled",
            chain: "hedera",
            txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            at: "2026-09-11T01:05:00.000Z",
          },
        ],
      }),
    );
    expect(links).toEqual({ awarded: undefined, paid: undefined, hedera: undefined });
  });
});

describe("pickListingHash", () => {
  test("returns the listed Hedera hash", () => {
    expect(pickListingHash(MOCK_DETAIL.timeline)).toBe(LISTED);
  });

  test("returns undefined when listing is absent", () => {
    expect(pickListingHash([])).toBeUndefined();
  });
});

describe("outcome copy", () => {
  test("labels terminal and awarded states", () => {
    expect(isOutcomeStatus("Bidding")).toBe(false);
    expect(isOutcomeStatus("Awarded")).toBe(true);
    expect(isOutcomeStatus("NoWinner")).toBe(true);
    expect(outcomeLabel("NoWinner")).toBe("No winner");
    expect(outcomeHeadline("Awarded")).toBe("Winner selected — delivery pending");
    expect(outcomeHeadline("Settled")).toBe("Auction settled");
  });
});
