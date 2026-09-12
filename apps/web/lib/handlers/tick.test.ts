import { describe, expect, test, beforeEach } from "bun:test";
import type { Address, Hex } from "viem";
import { ApiError, ErrorCode } from "../errors";
import type { HederaRailAuction } from "../hedera-escrow";
import type { AuctionView } from "../types";
import { resetTickLocks, runTick } from "./tick";

const REF =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;
const NOW = 1_800_000_100;

const BASE: AuctionView = {
  ref: REF,
  hederaAuctionId: "1",
  token: "0x1111111111111111111111111111111111111111",
  tokenName: "ON Serie I 2027",
  tokenSymbol: "ONS1",
  seller: "0xE789FA2538505252B5dCeAe9250705046640A7D4",
  amount: "10",
  deadline: String(NOW + 60),
  hederaStatus: "Open",
  arcStatus: "Bidding",
  topBid: "2000000",
  bidCount: "2",
  winner: null,
  clearingPrice: null,
  awardSource: "None",
  links: { hashscanAuction: "", hashscanToken: "", arcscanEscrow: "" },
};

function escrow(status: number, deadline: bigint): HederaRailAuction {
  return {
    seller: BASE.seller as Address,
    deadline,
    awardedAt: 0n,
    reserveCommitment: REF,
    status,
    winner: "0x0000000000000000000000000000000000000000",
    clearingPrice: 0n,
    source: 0,
    hederaTxHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    hederaAuctionId: 1n,
    totalEscrowed: 0n,
  };
}

beforeEach(() => {
  resetTickLocks();
});

describe("runTick", () => {
  test("Bidding before deadline does not close or settle", async () => {
    const calls: string[] = [];
    const result = await runTick({
      now: () => NOW,
      loadList: async () => [{ ...BASE, deadline: String(NOW + 60) }],
      closeArc: async () => {
        calls.push("closeArc");
        return { mode: "local" as const, arcTxHash: "0x1" as Hex, award: {} as never };
      },
      settleArc: async () => {
        calls.push("settleArc");
        return { hederaTxHash: "0x2", arcTxHash: "0x3" };
      },
      hederaConfigured: () => false,
      log: () => undefined,
    });
    expect(calls).toEqual([]);
    expect(result.ran).toEqual([]);
  });

  test("Bidding past deadline closes then settles with rethrow", async () => {
    const calls: string[] = [];
    let settleOpts: { onFailure?: string } | undefined;
    const result = await runTick({
      now: () => NOW,
      loadList: async () => [{ ...BASE, deadline: String(NOW - 1) }],
      closeArc: async () => {
        calls.push("closeArc");
        return { mode: "local" as const, arcTxHash: "0xabc" as Hex, award: {} as never };
      },
      settleArc: async (_ref, opts) => {
        calls.push("settleArc");
        settleOpts = opts;
        return { hederaTxHash: "0xdef", arcTxHash: "0xabc" };
      },
      hederaConfigured: () => false,
      log: () => undefined,
    });
    expect(calls).toEqual(["closeArc", "settleArc"]);
    expect(settleOpts?.onFailure).toBe("rethrow");
    expect(result.ran.map((r) => r.action)).toEqual(["close", "settle"]);
  });

  test("Awarded settles with rethrow and does not close", async () => {
    const calls: string[] = [];
    let settleOpts: { onFailure?: string } | undefined;
    await runTick({
      now: () => NOW,
      loadList: async () => [{ ...BASE, arcStatus: "Awarded", deadline: String(NOW - 1) }],
      closeArc: async () => {
        calls.push("closeArc");
        return { mode: "local" as const, arcTxHash: "0x1" as Hex, award: {} as never };
      },
      settleArc: async (_ref, opts) => {
        calls.push("settleArc");
        settleOpts = opts;
        return { hederaTxHash: "0x2", arcTxHash: "0x3" };
      },
      hederaConfigured: () => false,
      log: () => undefined,
    });
    expect(calls).toEqual(["settleArc"]);
    expect(settleOpts?.onFailure).toBe("rethrow");
  });

  test("Settled is a no-op", async () => {
    const calls: string[] = [];
    await runTick({
      now: () => NOW,
      loadList: async () => [{ ...BASE, arcStatus: "Settled", deadline: String(NOW - 1) }],
      closeArc: async () => {
        calls.push("closeArc");
        return { mode: "local" as const, arcTxHash: "0x1" as Hex, award: {} as never };
      },
      settleArc: async () => {
        calls.push("settleArc");
        return { hederaTxHash: "0x2", arcTxHash: "0x3" };
      },
      hederaConfigured: () => false,
      log: () => undefined,
    });
    expect(calls).toEqual([]);
  });

  test("Hedera Bidding past deadline does not close Arc", async () => {
    const calls: string[] = [];
    await runTick({
      now: () => NOW,
      loadList: async () => [{ ...BASE, arcStatus: "None", deadline: String(NOW - 1) }],
      closeArc: async () => {
        calls.push("closeArc");
        return { mode: "local" as const, arcTxHash: "0x1" as Hex, award: {} as never };
      },
      settleArc: async () => {
        calls.push("settleArc");
        return { hederaTxHash: "0x2", arcTxHash: "0x3" };
      },
      hederaConfigured: () => true,
      getHederaEscrow: async () => escrow(1, BigInt(NOW - 10)),
      closeHedera: async () => {
        calls.push("closeHedera");
        return { hederaTxHash: "0xaaa" };
      },
      settleHedera: async () => {
        calls.push("settleHedera");
        return { hederaTxHash: "0xbbb", payTxHash: "0xccc" };
      },
      log: () => undefined,
    });
    expect(calls).toEqual(["closeHedera", "settleHedera"]);
  });

  test("settle failure is recorded and does not void", async () => {
    const result = await runTick({
      now: () => NOW,
      loadList: async () => [{ ...BASE, arcStatus: "Awarded", deadline: String(NOW - 1) }],
      settleArc: async () => {
        throw new Error("rpc down");
      },
      hederaConfigured: () => false,
      log: () => undefined,
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.action).toBe("settle");
    expect(result.errors[0]?.rail).toBe("arc");
    expect(result.ran).toEqual([]);
  });

  test("409 BAD_STATUS is skipped not an error", async () => {
    const result = await runTick({
      now: () => NOW,
      loadList: async () => [{ ...BASE, arcStatus: "Awarded", deadline: String(NOW - 1) }],
      settleArc: async () => {
        throw new ApiError(409, ErrorCode.BAD_STATUS, "arc status is Settled");
      },
      hederaConfigured: () => false,
      log: () => undefined,
    });
    expect(result.errors).toEqual([]);
    expect(result.skipped).toEqual([
      { rail: "arc", ref: REF, action: "settle", reason: ErrorCode.BAD_STATUS },
    ]);
  });
});
