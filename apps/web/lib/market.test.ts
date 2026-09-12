import { describe, expect, test } from "bun:test";
import { MOCK_AUCTION } from "./mock";
import { filterAuctions, isOpenAuction, marketPhase } from "./market";
import type { AuctionView } from "./types";

const now = 1_780_000_000_000;

function auction(overrides: Partial<AuctionView>): AuctionView {
  return { ...MOCK_AUCTION, ...overrides };
}

describe("marketPhase", () => {
  test("live bidding is Open", () => {
    expect(
      marketPhase(auction({ hederaStatus: "Open", arcStatus: "Bidding", deadline: "1780000100" }), now),
    ).toBe("Open");
  });

  test("past deadline is Ended even if Arc still says Bidding", () => {
    expect(
      marketPhase(auction({ hederaStatus: "Open", arcStatus: "Bidding", deadline: "1779999999" }), now),
    ).toBe("Ended");
  });

  test("cancelled stays Cancelled", () => {
    expect(
      marketPhase(auction({ hederaStatus: "Cancelled", arcStatus: "Cancelled", deadline: "1779999999" }), now),
    ).toBe("Cancelled");
  });

  test("awarded and settled win over the clock", () => {
    expect(
      marketPhase(auction({ hederaStatus: "Open", arcStatus: "Awarded", deadline: "1779999999" }), now),
    ).toBe("Awarded");
    expect(
      marketPhase(auction({ hederaStatus: "Settled", arcStatus: "Settled", deadline: "1779999999" }), now),
    ).toBe("Settled");
  });
});

describe("filterAuctions", () => {
  const live = auction({ ref: "0x01", hederaStatus: "Open", arcStatus: "Bidding", deadline: "1780000100" });
  const ended = auction({ ref: "0x02", hederaStatus: "Open", arcStatus: "Bidding", deadline: "1779999999" });
  const cancelled = auction({
    ref: "0x03",
    hederaStatus: "Cancelled",
    arcStatus: "Cancelled",
    deadline: "1779999999",
  });

  test("ended lots leave Open and sit with cancelled in Closed", () => {
    const rows = [live, ended, cancelled];
    expect(filterAuctions(rows, "open", now).map((row) => row.ref)).toEqual(["0x01"]);
    expect(filterAuctions(rows, "closed", now).map((row) => row.ref)).toEqual(["0x02", "0x03"]);
    expect(isOpenAuction(ended, now)).toBe(false);
  });
});
