import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "remate-l5-routes-"));
import { getAddress, type Address, type Hex } from "viem";
import { computeCommitment } from "../../../../packages/shared/src/commitment";
import { usdc6 } from "../../../../packages/shared/src/chains";
import type { Snapshot } from "../../../../packages/shared/src/award";
import { ApiError, ErrorCode } from "../errors";
import type { HederaAuction } from "../hedera";
import { closeAuction } from "./close";
import { storeReserve } from "./reserve";
import { settleAuction } from "./settle";

const REF =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;
const SELLER = getAddress("0xE789FA2538505252B5dCeAe9250705046640A7D4");
const WINNER = getAddress("0xC728d5658e1256330D842607A6029C0d06727435");
const SALT =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as Hex;
const RESERVE = usdc6(14_000).toString();
const COMMITMENT = computeCommitment(RESERVE, SALT);

function hederaOpen(): HederaAuction {
  return {
    id: 1n,
    token: getAddress("0x1111111111111111111111111111111111111111"),
    seller: SELLER,
    partition:
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    holdId: 1n,
    amount: 10n,
    deadline: 1_800_000_000n,
    createdAt: 1_700_000_000n,
    reserveCommitment: COMMITMENT,
    status: 1,
    winner: "0x0000000000000000000000000000000000000000",
    ref: REF,
  };
}

describe("POST /reserve", () => {
  test("409 COMMITMENT_MISMATCH on wrong salt", async () => {
    expect(
      storeReserve(
        REF,
        {
          reserve: RESERVE,
          salt: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        },
        {
          resolveId: async () => 1n,
          getAuction: async () => hederaOpen(),
        },
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: ErrorCode.COMMITMENT_MISMATCH,
    });
  });

  test("stores reserve when commitment matches", async () => {
    const persisted: { reserve?: string; salt?: string } = {};
    const result = await storeReserve(
      REF,
      { reserve: RESERVE, salt: SALT },
      {
        resolveId: async () => 1n,
        getAuction: async () => hederaOpen(),
        persist: async (fn) => {
          const db = { auctions: {} as Record<string, never> };
          await fn(db as never);
          const row = (db.auctions as Record<string, { reserve?: string; salt?: string }>)[REF];
          persisted.reserve = row?.reserve;
          persisted.salt = row?.salt;
          return undefined as never;
        },
      },
    );
    expect(result).toEqual({ ok: true });
    expect(persisted.reserve).toBe(RESERVE);
    expect(persisted.salt).toBe(SALT);
  });
});

describe("POST /close", () => {
  const bidding = {
    seller: SELLER,
    deadline: 100n,
    awardedAt: 0n,
    reserveCommitment: COMMITMENT,
    status: 1,
    winner: "0x0000000000000000000000000000000000000000" as Address,
    clearingPrice: 0n,
    source: 0,
    hederaTxHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
    hederaAuctionId: 1n,
    totalEscrowed: 0n,
  };

  test("cre mode POSTs the trigger and returns accepted", async () => {
    let triggered = "";
    const result = await closeAuction(
      REF,
      {},
      {
        now: () => 200,
        awardMode: "cre",
        getArcAuction: async () => bidding,
        triggerCre: async (ref) => {
          triggered = ref;
        },
      },
    );
    expect(result).toEqual({ mode: "cre", accepted: true });
    expect(triggered).toBe(REF);
  });

  test("local mode awards without echoing the reserve", async () => {
    const snapshot: Snapshot = {
      ref: REF,
      deadline: 100,
      seller: SELLER,
      reserveCommitment: COMMITMENT,
      bids: [{ bidder: WINNER, amount: usdc6(15_200).toString() }],
      reserve: { value: RESERVE, salt: SALT },
      hedera: {
        token: getAddress("0x1111111111111111111111111111111111111111"),
        partition:
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        amount: "10",
        seller: SELLER,
        auctionId: "1",
      },
    };
    const written: { outcome?: number; winner?: string } = {};
    const result = await closeAuction(
      REF,
      { forceLocal: true },
      {
        now: () => 200,
        getArcAuction: async () => bidding,
        buildSnapshot: async () => snapshot,
        screen: async () => [
          {
            address: WINNER,
            whitelisted: true,
            kyc: "GRANTED",
            sanctions: "CLEAR",
            canTransfer: true,
            code: "0x01",
            reason: "0x",
          },
        ],
        awardByOperator: async (args) => {
          written.outcome = args.outcome;
          written.winner = args.winner;
          return "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        },
      },
    );
    expect(result.mode).toBe("local");
    if (result.mode === "local") {
      expect(result.award.winner).toBe(WINNER);
      expect(result.award.outcome).toBe(1);
      expect(JSON.stringify(result)).not.toContain(RESERVE);
      expect(JSON.stringify(result)).not.toContain(SALT.slice(2, 10));
    }
    expect(written.winner).toBe(WINNER);
  });

  test("rejects close before deadline", async () => {
    expect(
      closeAuction(
        REF,
        { forceLocal: true },
        {
          now: () => 50,
          getArcAuction: async () => bidding,
        },
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: ErrorCode.BEFORE_DEADLINE,
    });
  });
});

describe("POST /settle", () => {
  const awarded = {
    seller: SELLER,
    deadline: 100n,
    awardedAt: 110n,
    reserveCommitment: COMMITMENT,
    status: 2,
    winner: WINNER,
    clearingPrice: usdc6(15_200),
    source: 2,
    hederaTxHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
    hederaAuctionId: 1n,
    totalEscrowed: usdc6(15_200),
  };

  test("success confirms delivery on both chains", async () => {
    const result = await settleAuction(REF, {
      getArcAuction: async () => awarded,
      resolveId: async () => 1n,
      settleOnHedera: async () =>
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      confirmDelivery: async () =>
        "0x2222222222222222222222222222222222222222222222222222222222222222",
    });
    expect(result).toEqual({
      hederaTxHash:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      arcTxHash:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
    });
  });

  test("ATS revert voids the award", async () => {
    const err = Object.assign(new Error("InvalidKycStatus"), {
      data: "0x",
    });
    const result = await settleAuction(REF, {
      getArcAuction: async () => awarded,
      resolveId: async () => 1n,
      settleOnHedera: async () => {
        throw err;
      },
      voidAward: async () =>
        "0x3333333333333333333333333333333333333333333333333333333333333333",
      cancelOnHedera: async () =>
        "0x4444444444444444444444444444444444444444444444444444444444444444",
    });
    expect(result).toMatchObject({ voided: true, reason: "InvalidKycStatus" });
  });
});

describe("errors", () => {
  test("ApiError does not echo reserved words in a useful leak", () => {
    const err = new ApiError(400, "X", "reserve=14000 salt=abcd");
    expect(err.message).not.toContain("reserve=14000");
  });
});
