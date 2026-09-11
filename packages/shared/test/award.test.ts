import { describe, expect, test } from "bun:test";
import { keccak256 } from "viem";
import {
  CommitmentMismatch,
  computeAward,
  computeBidsDigest,
  computeReserveCommitment,
  ZERO_ADDRESS,
  type Screening,
  type ScreeningRow,
  type Snapshot,
  type SnapshotBid,
} from "../src/award.ts";

const SELLER = "0xE789FA2538505252B5dCeAe9250705046640A7D4" as const;
const BUYER_A = "0x39E24D0C0a464a9249A908Cc6727cFd69Be8c1F9" as const;
const BUYER_B = "0xC728d5658e1256330D842607A6029C0d06727435" as const;
const BUYER_C = "0x326B63C281Ea426dd9802Fe442d920B6399a0F98" as const;
const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const PARTITION =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
const REF =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const SALT =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

/** Demo lot: 14,000 USDC (6 decimals). Tests compare amounts, they do not log them. */
const RESERVE = "14000000000";
const BID_A = "14500000000";
const BID_B = "15200000000";
const BID_LOW_A = "10000000000";
const BID_LOW_B = "11000000000";

function row(
  address: ScreeningRow["address"],
  overrides: Partial<ScreeningRow> = {},
): ScreeningRow {
  return {
    address,
    whitelisted: true,
    kyc: "GRANTED",
    sanctions: "CLEAR",
    canTransfer: true,
    code: "0x01",
    reason: "ok",
    ...overrides,
  };
}

function snapshot(
  bids: SnapshotBid[],
  reserve = RESERVE,
  salt = SALT,
): Snapshot {
  return {
    ref: REF,
    deadline: 1_800_000_000,
    seller: SELLER,
    reserveCommitment: computeReserveCommitment(reserve, salt),
    bids,
    reserve: { value: reserve, salt },
    hedera: {
      token: TOKEN,
      partition: PARTITION,
      amount: "10",
      seller: SELLER,
      auctionId: "1",
    },
  };
}

const bothEligible: Screening = [row(BUYER_A), row(BUYER_B)];

describe("computeAward", () => {
  test("1. two eligible bids above reserve: higher bid wins first-price", () => {
    const award = computeAward(
      snapshot([
        { bidder: BUYER_A, amount: BID_A },
        { bidder: BUYER_B, amount: BID_B },
      ]),
      bothEligible,
    );
    expect(award.outcome).toBe(1);
    expect(award.winner).toBe(BUYER_B);
    expect(award.clearingPrice).toBe(BigInt(BID_B));
    expect(award.eligible).toBe(2);
    expect(award.reserveCommitment).toBe(computeReserveCommitment(RESERVE, SALT));
  });

  test("2. tie on amount: earlier snapshot bidder wins", () => {
    const award = computeAward(
      snapshot([
        { bidder: BUYER_A, amount: BID_A },
        { bidder: BUYER_B, amount: BID_A },
      ]),
      bothEligible,
    );
    expect(award.outcome).toBe(1);
    expect(award.winner).toBe(BUYER_A);
    expect(award.clearingPrice).toBe(BigInt(BID_A));
  });

  test("3. highest bid from a non-KYC bidder: second bidder wins", () => {
    const award = computeAward(
      snapshot([
        { bidder: BUYER_A, amount: BID_A },
        { bidder: BUYER_C, amount: BID_B },
      ]),
      [row(BUYER_A), row(BUYER_C, { kyc: "NOT_GRANTED", canTransfer: false })],
    );
    expect(award.outcome).toBe(1);
    expect(award.winner).toBe(BUYER_A);
    expect(award.clearingPrice).toBe(BigInt(BID_A));
    expect(award.eligible).toBe(1);
  });

  test("4. highest bidder sanctions HIT: other eligible bidder wins", () => {
    const award = computeAward(
      snapshot([
        { bidder: BUYER_A, amount: BID_A },
        { bidder: BUYER_B, amount: BID_B },
      ]),
      [row(BUYER_A), row(BUYER_B, { sanctions: "HIT", canTransfer: false })],
    );
    expect(award.outcome).toBe(1);
    expect(award.winner).toBe(BUYER_A);
    expect(award.clearingPrice).toBe(BigInt(BID_A));
    expect(award.eligible).toBe(1);
  });

  test("5. all bidders ineligible: outcome 2, winner zero", () => {
    const award = computeAward(
      snapshot([
        { bidder: BUYER_A, amount: BID_A },
        { bidder: BUYER_B, amount: BID_B },
      ]),
      [
        row(BUYER_A, { whitelisted: false, canTransfer: false }),
        row(BUYER_B, { kyc: "NOT_GRANTED", canTransfer: false }),
      ],
    );
    expect(award.outcome).toBe(2);
    expect(award.winner).toBe(ZERO_ADDRESS);
    expect(award.clearingPrice).toBe(0n);
    expect(award.eligible).toBe(0);
  });

  test("6. all eligible bids below reserve: outcome 3", () => {
    const award = computeAward(
      snapshot([
        { bidder: BUYER_A, amount: BID_LOW_A },
        { bidder: BUYER_B, amount: BID_LOW_B },
      ]),
      bothEligible,
    );
    expect(award.outcome).toBe(3);
    expect(award.winner).toBe(ZERO_ADDRESS);
    expect(award.clearingPrice).toBe(0n);
    expect(award.eligible).toBe(2);
  });

  test("7. no bids: outcome 4 and empty-book digest", () => {
    const award = computeAward(snapshot([]), []);
    expect(award.outcome).toBe(4);
    expect(award.winner).toBe(ZERO_ADDRESS);
    expect(award.clearingPrice).toBe(0n);
    expect(award.eligible).toBe(0);
    expect(award.bidsDigest).toBe(keccak256("0x"));
  });

  test("8. commitment mismatch (wrong salt) throws", () => {
    const snap = snapshot([{ bidder: BUYER_A, amount: BID_A }]);
    snap.reserve = {
      value: RESERVE,
      salt: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    };
    expect(() => computeAward(snap, [row(BUYER_A)])).toThrow(CommitmentMismatch);
  });

  test("9. bidder absent from screening is ineligible", () => {
    const award = computeAward(
      snapshot([
        { bidder: BUYER_A, amount: BID_A },
        { bidder: BUYER_B, amount: BID_B },
      ]),
      [row(BUYER_A)],
    );
    expect(award.outcome).toBe(1);
    expect(award.winner).toBe(BUYER_A);
    expect(award.clearingPrice).toBe(BigInt(BID_A));
    expect(award.eligible).toBe(1);
  });

  test("10. digest is stable for the same order and changes when reordered", () => {
    const ordered: SnapshotBid[] = [
      { bidder: BUYER_A, amount: BID_A },
      { bidder: BUYER_B, amount: BID_B },
    ];
    const reordered: SnapshotBid[] = [
      { bidder: BUYER_B, amount: BID_B },
      { bidder: BUYER_A, amount: BID_A },
    ];
    const first = computeAward(snapshot(ordered), bothEligible);
    const again = computeAward(snapshot(ordered), bothEligible);
    const swapped = computeAward(snapshot(reordered), bothEligible);
    expect(first.bidsDigest).toBe(again.bidsDigest);
    expect(first.bidsDigest).toBe(computeBidsDigest(ordered));
    expect(swapped.bidsDigest).not.toBe(first.bidsDigest);
    expect(swapped.bidsDigest).toBe(computeBidsDigest(reordered));
  });
});
