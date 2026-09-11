import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./constants";

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUsdc(baseUnits: bigint | string | null | undefined): string {
  if (baseUnits === null || baseUnits === undefined || baseUnits === "") return "—";
  try {
    const value = typeof baseUnits === "string" ? BigInt(baseUnits) : baseUnits;
    const raw = formatUnits(value, USDC_DECIMALS);
    const [ints, frac = ""] = raw.split(".");
    const grouped = Number(ints).toLocaleString("en-US");
    return `${grouped}.${frac.slice(0, 2).padEnd(2, "0")}`;
  } catch {
    return "—";
  }
}

export function formatBondAmount(
  baseUnits: bigint | string | null | undefined,
  decimals: number,
  symbol?: string,
): string {
  if (baseUnits === null || baseUnits === undefined || baseUnits === "") return "—";
  try {
    const value = typeof baseUnits === "string" ? BigInt(baseUnits) : baseUnits;
    const raw = formatUnits(value, decimals);
    const [ints, frac = ""] = raw.split(".");
    const grouped = Number(ints).toLocaleString("en-US");
    const body = decimals === 0 || !frac.replace(/0+$/, "")
      ? grouped
      : `${grouped}.${frac.replace(/0+$/, "")}`;
    return symbol ? `${body} ${symbol}` : body;
  } catch {
    return "—";
  }
}

export function parseDecimalInput(input: string, decimals: number): bigint {
  const trimmed = input.trim().replace(/,/g, "");
  if (!trimmed) throw new Error("Amount is required");
  const [ints, frac = ""] = trimmed.split(".");
  if (!/^\d+$/.test(ints) || (frac && !/^\d+$/.test(frac))) {
    throw new Error("Invalid amount");
  }
  if (frac.length > decimals) throw new Error(`Max ${decimals} decimal places`);
  const padded = frac.padEnd(decimals, "0");
  return BigInt(ints + padded);
}

export function deadlineUnix(deadline: string | number): number {
  if (typeof deadline === "number") return deadline;
  if (/^\d+$/.test(deadline)) return Number(deadline);
  return Math.floor(new Date(deadline).getTime() / 1000);
}

export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isoUtc(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

export function bytes3ToAscii(value: string | undefined): string {
  if (!value) return "";
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  const chars = hex
    .match(/.{2}/g)
    ?.map((b) => {
      const code = Number.parseInt(b, 16);
      return code >= 32 && code < 127 ? String.fromCharCode(code) : "";
    })
    .join("")
    .trim();
  return chars || value;
}

export function eligibilityLabel(status: {
  canReceive: boolean;
  code: string;
  reasonText: string;
}): { tone: "ok" | "bad"; text: string } {
  if (status.canReceive) {
    return { tone: "ok", text: "Eligible to receive this bond" };
  }
  const code = status.code.toLowerCase();
  if (code === "0x51") {
    return { tone: "bad", text: "Not eligible — 0x51 KYC not granted" };
  }
  if (code === "0x43" || status.reasonText.includes("not whitelisted")) {
    return { tone: "bad", text: "Not eligible — 0x43 not whitelisted" };
  }
  return {
    tone: "bad",
    text: `Not eligible — ${status.code} ${status.reasonText}`.trim(),
  };
}

export function isTxHash(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}
