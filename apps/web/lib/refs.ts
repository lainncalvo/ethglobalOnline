// server-only — L5 backend. Do not import from client components.
import { isRef, parseRef } from "../../../packages/shared/src/ref";
import type { Hex } from "viem";
import { ApiError, ErrorCode } from "./errors";

export function requireRef(value: string): Hex {
  try {
    if (!isRef(value)) {
      throw new Error("invalid ref");
    }
    return parseRef(value);
  } catch {
    throw new ApiError(400, ErrorCode.INVALID_REF, "ref must be 0x + 64 hex");
  }
}
