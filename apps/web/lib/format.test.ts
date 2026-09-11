import { describe, expect, test } from "bun:test";
import { keccak256, toBytes, slice } from "viem";
import { DEMO_WALLETS } from "./constants";
import { decodeTxError } from "./decode-error";
import {
  eligibilityLabel,
  formatBondAmount,
  formatUsdc,
  parseDecimalInput,
  shortAddress,
} from "./format";
import { mockCompliance } from "./mock";
import { computeCommitment } from "./tx";

describe("formatUsdc", () => {
  test("formats 6-decimal base units with thousands separators", () => {
    expect(formatUsdc(14_000_000000n)).toBe("14,000.00");
    expect(formatUsdc("15200000000")).toBe("15,200.00");
    expect(formatUsdc(null)).toBe("—");
  });
});

describe("formatBondAmount", () => {
  test("shows whole bonds without trailing zeros", () => {
    expect(formatBondAmount(10n, 0, "ON27")).toBe("10 ON27");
    expect(formatBondAmount(10_000000000000000000n, 18, "ON27")).toBe("10 ON27");
  });
});

describe("parseDecimalInput", () => {
  test("parses USDC to 6 decimals", () => {
    expect(parseDecimalInput("14000", 6)).toBe(14_000_000000n);
    expect(parseDecimalInput("14500.5", 6)).toBe(14_500_500000n);
  });

  test("rejects extra fraction digits", () => {
    expect(() => parseDecimalInput("1.1234567", 6)).toThrow();
  });
});

describe("shortAddress", () => {
  test("truncates checksum addresses", () => {
    expect(shortAddress(DEMO_WALLETS.buyerC)).toBe("0x326B…0F98");
  });
});

describe("eligibility", () => {
  test("Buyer C mock is not eligible and disables bidding", () => {
    const status = mockCompliance(DEMO_WALLETS.buyerC);
    expect(status.canReceive).toBe(false);
    expect(eligibilityLabel(status)).toEqual({
      tone: "bad",
      text: "Not eligible — 0x51 KYC not granted",
    });
  });

  test("Buyer A mock is eligible", () => {
    const status = mockCompliance(DEMO_WALLETS.buyerA);
    expect(status.canReceive).toBe(true);
    expect(eligibilityLabel(status).tone).toBe("ok");
  });

  test("maps 0x43", () => {
    expect(eligibilityLabel({ canReceive: false, code: "0x43", reasonText: "x" }).text).toBe(
      "Not eligible — 0x43 not whitelisted",
    );
  });
});

describe("decodeTxError", () => {
  test("maps ATS KYC selector", () => {
    const selector = slice(keccak256(toBytes("InvalidKycStatus()")), 0, 4);
    const decoded = decodeTxError({ data: selector });
    expect(decoded.name).toBe("InvalidKycStatus");
  });
});

describe("computeCommitment", () => {
  test("is deterministic for the demo reserve", () => {
    const salt = "0x1111111111111111111111111111111111111111111111111111111111111111" as const;
    const first = computeCommitment(14_000_000000n, salt);
    const second = computeCommitment(14_000_000000n, salt);
    expect(first).toBe(second);
    expect(first).toHaveLength(66);
  });
});
