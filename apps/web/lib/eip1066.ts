// server-only — L5 backend. Do not import from client components.
import type { Hex } from "viem";

export function asByteCode(value: unknown): Hex {
  if (typeof value === "string" && value.startsWith("0x")) {
    const hex = value.slice(0, 4).toLowerCase();
    return (hex.length === 4 ? hex : `${hex}00`.slice(0, 4)) as Hex;
  }
  return "0x00";
}

export function reasonText(ok: boolean, code: Hex, reason?: unknown): string {
  const c = code.toLowerCase();
  if (ok && (c === "0x01" || c === "0x51" || c === "0x00")) {
    return "transfer allowed";
  }
  if (c === "0x43") return "recipient not whitelisted";
  if (c === "0x51") return "recipient KYC not granted";
  const extra =
    typeof reason === "string" && reason.startsWith("0x") && reason !== "0x"
      ? ` ${reason}`
      : "";
  return `blocked: code ${c}${extra}`;
}

export function asReasonHex(value: unknown): string {
  if (typeof value === "string") return value;
  return "0x";
}
