import { type Abi, decodeErrorResult, keccak256, slice, toBytes } from "viem";
import { atsErrorAbi, bidEscrowAbi, exitAuctionAbi } from "./abi";

const COMBINED_ABI = [
  ...atsErrorAbi,
  ...exitAuctionAbi.filter((item) => item.type === "error"),
  ...bidEscrowAbi.filter((item) => item.type === "error"),
] as Abi;

const NAMED_SELECTORS: Record<string, string> = Object.fromEntries(
  [
    "AccountIsBlocked()",
    "InvalidKycStatus()",
    "AddressNotVerified()",
    "ComplianceNotAllowed()",
    "IsPaused()",
    "NotOperator()",
    "NotSeller()",
    "DeadlineTooSoon()",
    "HoldNotForThisEscrow()",
    "HoldHasFixedDestination()",
    "HoldAmountMismatch()",
    "AlreadyListed()",
    "BeforeDeadline()",
    "AfterDeadline()",
    "ZeroAddress()",
    "UnknownRef()",
    "CommitmentMismatch()",
    "InsufficientBid()",
    "NothingToWithdraw()",
    "TooEarly()",
    "ZeroAmount()",
  ].map((sig) => [slice(keccak256(toBytes(sig)), 0, 4).toLowerCase(), sig.replace("()", "")]),
);

export type DecodedTxError = {
  name: string;
  message: string;
  raw?: string;
};

function extractHex(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  for (const key of ["data", "raw", "hex"]) {
    const value = record[key];
    if (typeof value === "string" && value.startsWith("0x")) return value;
  }
  if (record.cause) return extractHex(record.cause);
  return undefined;
}

export function decodeTxError(error: unknown): DecodedTxError {
  const fallback =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Transaction failed";
  const short =
    error && typeof error === "object" && "shortMessage" in error
      ? String((error as { shortMessage: unknown }).shortMessage)
      : fallback;

  const hex = extractHex(error);
  if (hex && hex.length >= 10) {
    const selector = hex.slice(0, 10).toLowerCase();
    const mapped = NAMED_SELECTORS[selector];
    try {
      const decoded = decodeErrorResult({ abi: COMBINED_ABI, data: hex as `0x${string}` });
      return { name: decoded.errorName, message: decoded.errorName, raw: hex };
    } catch {
      if (mapped) return { name: mapped, message: mapped, raw: hex };
    }
  }

  const match = short.match(/\b(AccountIsBlocked|InvalidKycStatus|AddressNotVerified|ComplianceNotAllowed|IsPaused|NotSeller|NotOperator|UnknownRef|NothingToWithdraw|ZeroAmount|AfterDeadline|BeforeDeadline|BadStatus)\b/);
  if (match) return { name: match[1], message: match[1], raw: hex };

  return { name: "Error", message: short, raw: hex };
}
