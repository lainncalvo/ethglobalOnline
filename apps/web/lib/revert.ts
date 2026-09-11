// server-only — L5 backend. Do not import from client components.
import { decodeErrorResult, type Hex } from "viem";
import bidEscrowAbi from "../../../packages/shared/src/abi/BidEscrow.json";
import exitAuctionAbi from "../../../packages/shared/src/abi/ExitAuction.json";
import atsAbi from "../../../packages/shared/src/abi/IATSBond.json";

const KNOWN = [
  "AccountIsBlocked",
  "InvalidKycStatus",
  "AddressNotVerified",
  "ComplianceNotAllowed",
  "IsPaused",
] as const;

const errorAbi = [
  ...(atsAbi as { type?: string }[]).filter((x) => x.type === "error"),
  ...(exitAuctionAbi as { type?: string }[]).filter((x) => x.type === "error"),
  ...(bidEscrowAbi as { type?: string }[]).filter((x) => x.type === "error"),
] as Parameters<typeof decodeErrorResult>[0]["abi"];

function isHex(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value);
}

function walk(err: unknown, depth = 0): Hex | undefined {
  if (!err || depth > 6) return undefined;
  if (typeof err === "string") {
    const match = err.match(/0x[0-9a-fA-F]{8,}/);
    return match ? (match[0] as Hex) : undefined;
  }
  if (typeof err !== "object") return undefined;
  const rec = err as Record<string, unknown>;
  for (const key of ["data", "raw", "hex"]) {
    if (isHex(rec[key])) return rec[key];
    if (rec[key] && typeof rec[key] === "object") {
      const inner = rec[key] as Record<string, unknown>;
      if (isHex(inner.data)) return inner.data;
    }
  }
  return walk(rec.cause, depth + 1) ?? walk(rec.walk, depth + 1);
}

export function extractTxHash(err: unknown): Hex | undefined {
  if (!err || typeof err !== "object") return undefined;
  const rec = err as Record<string, unknown>;
  if (isHex(rec.hash) && rec.hash.length === 66) return rec.hash;
  if (rec.cause && typeof rec.cause === "object") {
    const cause = rec.cause as Record<string, unknown>;
    if (isHex(cause.hash) && cause.hash.length === 66) return cause.hash;
    if (isHex(cause.transactionHash) && cause.transactionHash.length === 66) {
      return cause.transactionHash;
    }
  }
  return undefined;
}

export function decodeRevertName(err: unknown): string {
  const data = walk(err);
  if (data) {
    try {
      const decoded = decodeErrorResult({ abi: errorAbi, data });
      return decoded.errorName;
    } catch {
      // fall through
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  for (const name of KNOWN) {
    if (message.includes(name)) return name;
  }
  return "Unknown";
}
