import { describe, expect, test } from "bun:test";
import { isFreeBalanceRejection } from "./eip1066";

const INSUFFICIENT_BALANCE =
  "0x5d6824c400000000000000000000000000000000000000000000000000000000";
const ACCOUNT_IS_BLOCKED =
  "0x796c1f0d00000000000000000000000000000000000000000000000000000000";

describe("isFreeBalanceRejection", () => {
  test("flags a seller free-balance shortfall on a held lot", () => {
    expect(isFreeBalanceRejection(false, INSUFFICIENT_BALANCE)).toBe(true);
  });

  test("leaves real compliance rejections alone", () => {
    expect(isFreeBalanceRejection(false, ACCOUNT_IS_BLOCKED)).toBe(false);
  });

  test("never fires when the transfer already passed", () => {
    expect(isFreeBalanceRejection(true, INSUFFICIENT_BALANCE)).toBe(false);
  });
});
