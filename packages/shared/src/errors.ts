export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  INVALID_REF: "INVALID_REF",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  INVALID_BODY: "INVALID_BODY",
  COMMITMENT_MISMATCH: "COMMITMENT_MISMATCH",
  NO_RESERVE: "NO_RESERVE",
  BAD_STATUS: "BAD_STATUS",
  BEFORE_DEADLINE: "BEFORE_DEADLINE",
  AFTER_DEADLINE: "AFTER_DEADLINE",
  AUCTION_NOT_OPEN: "AUCTION_NOT_OPEN",
  TOO_MANY_CANDIDATES: "TOO_MANY_CANDIDATES",
  AWARD_ENGINE_UNAVAILABLE: "AWARD_ENGINE_UNAVAILABLE",
  CHAIN_UNREACHABLE: "CHAIN_UNREACHABLE",
  CONFIG: "CONFIG",
  CRE_TRIGGER_FAILED: "CRE_TRIGGER_FAILED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCodeName = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ApiErrorBody = {
  error: {
    code: ErrorCodeName | string;
    message: string;
  };
};

export function apiErrorBody(
  code: ErrorCodeName | string,
  message: string,
): ApiErrorBody {
  return { error: { code, message } };
}
