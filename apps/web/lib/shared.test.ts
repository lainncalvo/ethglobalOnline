import { describe, expect, test } from "bun:test";
import { getAddress, keccak256 } from "viem";
import { computeReserveCommitment } from "../../../packages/shared/src/award";
import { usdc6 } from "../../../packages/shared/src/chains";
import { computeCommitment } from "../../../packages/shared/src/commitment";
import { computeRef, isRef, parseRef } from "../../../packages/shared/src/ref";

const EXIT = getAddress("0x1111111111111111111111111111111111111111");
const SALT =
  "0x2222222222222222222222222222222222222222222222222222222222222222" as const;

describe("shared primitives", () => {
  test("computeRef is 0x + 64 hex and stable", () => {
    const a = computeRef(296, EXIT, 1);
    const b = computeRef(296n, EXIT, "1");
    expect(isRef(a)).toBe(true);
    expect(a).toBe(b);
    expect(parseRef(a)).toBe(a.toLowerCase());
    expect(computeRef(296, EXIT, 2)).not.toBe(a);
  });

  test("computeCommitment matches award engine", () => {
    const reserve = usdc6(14_000);
    expect(reserve).toBe(14_000_000_000n);
    const ours = computeCommitment(reserve, SALT);
    const theirs = computeReserveCommitment(reserve.toString(), SALT);
    expect(ours).toBe(theirs);
    expect(computeCommitment("14000000000", SALT)).toBe(ours);
  });

  test("parseRef rejects short values", () => {
    expect(() => parseRef("0x1234")).toThrow();
    expect(keccak256("0x").length).toBe(66);
  });
});
