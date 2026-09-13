// server-only — operator tick. Do not import from client components.
import type { Hex } from "viem";
import { ApiError, ErrorCode, redactText } from "../errors";
import { deadlineUnix } from "../format";
import {
  hederaRailAddresses,
  hederaRailStatusName,
  getHederaRailAuction,
  type HederaRailAuction,
} from "../hedera-escrow";
import type { AuctionView } from "../types";
import { loadAuctionList } from "../views";
import { closeAuction } from "./close";
import { closeHederaRail, settleHederaRail } from "./hedera-rail";
import { settleAuction } from "./settle";

const TERMINAL = new Set([
  "Settled",
  "Voided",
  "Cancelled",
  "Expired",
  "NoWinner",
]);

const SKIPPABLE = new Set<string>([
  ErrorCode.BEFORE_DEADLINE,
  ErrorCode.BAD_STATUS,
  ErrorCode.NO_RESERVE,
  ErrorCode.AUCTION_NOT_OPEN,
]);

export type TickRail = "arc" | "hedera";
export type TickActionName = "close" | "settle";

export type TickRan = {
  rail: TickRail;
  ref: string;
  action: TickActionName;
  hashes?: Record<string, string>;
};

export type TickSkipped = {
  rail: TickRail;
  ref: string;
  action: TickActionName;
  reason: string;
};

export type TickError = {
  rail: TickRail;
  ref: string;
  action: TickActionName;
  code?: string;
  message: string;
};

export type TickResult = {
  ran: TickRan[];
  skipped: TickSkipped[];
  errors: TickError[];
  busy?: boolean;
};

export type TickDeps = {
  now?: () => number;
  loadList?: () => Promise<AuctionView[]>;
  closeArc?: typeof closeAuction;
  settleArc?: typeof settleAuction;
  hederaConfigured?: () => boolean;
  getHederaEscrow?: (ref: Hex) => Promise<HederaRailAuction>;
  closeHedera?: typeof closeHederaRail;
  settleHedera?: typeof settleHederaRail;
  log?: (payload: Record<string, unknown>) => void;
};

let tickRunning = false;
const inFlight = new Set<string>();

function flightKey(rail: TickRail, ref: string): string {
  return `${rail}:${ref}`;
}

function hashesFrom(result: unknown): Record<string, string> | undefined {
  if (!result || typeof result !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
    if (typeof value === "string" && /hash/i.test(key) && value.startsWith("0x")) {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function defaultLog(payload: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    safe[key] = typeof value === "string" ? redactText(value) : value;
  }
  const rail = typeof safe.rail === "string" ? safe.rail : "";
  const action = typeof safe.action === "string" ? safe.action : "log";
  const ref = typeof safe.ref === "string" ? safe.ref : "";
  // Plaintext prefix: Railway drops JSON-only stdout from the message field.
  console.log(`tick ${rail} ${action} ${ref}`.trim(), JSON.stringify(safe));
}

function skipReason(err: unknown): string | undefined {
  if (err instanceof ApiError && SKIPPABLE.has(err.code)) return err.code;
  return undefined;
}

function errorFields(err: unknown): Pick<TickError, "code" | "message"> {
  return {
    code: err instanceof ApiError ? err.code : undefined,
    message: redactText(err instanceof Error ? err.message : "internal error"),
  };
}

async function runAction(
  rail: TickRail,
  ref: string,
  action: TickActionName,
  out: TickResult,
  log: NonNullable<TickDeps["log"]>,
  fn: () => Promise<unknown>,
): Promise<boolean> {
  const key = flightKey(rail, ref);
  if (inFlight.has(key)) {
    out.skipped.push({ rail, ref, action, reason: "in-flight" });
    return false;
  }
  inFlight.add(key);
  try {
    const value = await fn();
    const hashes = hashesFrom(value);
    out.ran.push({ rail, ref, action, hashes });
    log({ rail, action, ref, hashes });
    return true;
  } catch (err) {
    const reason = skipReason(err);
    if (reason) {
      out.skipped.push({ rail, ref, action, reason });
      return false;
    }
    const fields = errorFields(err);
    out.errors.push({ rail, ref, action, ...fields });
    log({ rail, action, ref, error: fields.code ?? "UNKNOWN", message: fields.message });
    return false;
  } finally {
    inFlight.delete(key);
  }
}

export async function runTick(deps: TickDeps = {}): Promise<TickResult> {
  const out: TickResult = { ran: [], skipped: [], errors: [] };
  if (tickRunning) {
    return { ...out, busy: true };
  }
  tickRunning = true;
  const log = deps.log ?? defaultLog;
  try {
    const now = (deps.now ?? (() => Math.floor(Date.now() / 1000)))();
    const list = await (deps.loadList ?? loadAuctionList)();
    const closeArc = deps.closeArc ?? closeAuction;
    const settleArc = deps.settleArc ?? settleAuction;
    const hederaOn = (deps.hederaConfigured ?? (() => Boolean(hederaRailAddresses().escrow)))();
    const getHederaEscrow = deps.getHederaEscrow ?? getHederaRailAuction;
    const closeHedera = deps.closeHedera ?? closeHederaRail;
    const settleHedera = deps.settleHedera ?? settleHederaRail;

    for (const auction of list) {
      const ref = auction.ref;
      const arcStatus = auction.arcStatus;
      if (!TERMINAL.has(arcStatus) && arcStatus !== "None") {
        const past = now >= deadlineUnix(auction.deadline);
        if (arcStatus === "Bidding" && past) {
          const closed = await runAction("arc", ref, "close", out, log, () =>
            closeArc(ref),
          );
          if (closed) {
            await runAction("arc", ref, "settle", out, log, () =>
              settleArc(ref, { onFailure: "rethrow" }),
            );
          }
        } else if (arcStatus === "Awarded") {
          await runAction("arc", ref, "settle", out, log, () =>
            settleArc(ref, { onFailure: "rethrow" }),
          );
        }
      }

      if (!hederaOn) continue;
      let escrow: HederaRailAuction;
      try {
        escrow = await getHederaEscrow(ref as Hex);
      } catch (err) {
        const fields = errorFields(err);
        out.errors.push({
          rail: "hedera",
          ref,
          action: "close",
          ...fields,
        });
        log({
          rail: "hedera",
          action: "read",
          ref,
          error: fields.code ?? "UNKNOWN",
          message: fields.message,
        });
        continue;
      }
      const hederaStatus = hederaRailStatusName(escrow.status);
      if (TERMINAL.has(hederaStatus) || hederaStatus === "None") continue;
      const pastHedera = now >= Number(escrow.deadline);
      if (hederaStatus === "Bidding" && pastHedera) {
        const closed = await runAction("hedera", ref, "close", out, log, () =>
          closeHedera(ref),
        );
        if (closed) {
          await runAction("hedera", ref, "settle", out, log, () =>
            settleHedera(ref, { onFailure: "rethrow" }),
          );
        }
      } else if (hederaStatus === "Awarded") {
        await runAction("hedera", ref, "settle", out, log, () =>
          settleHedera(ref, { onFailure: "rethrow" }),
        );
      }
    }
    return out;
  } finally {
    tickRunning = false;
  }
}

/** Test-only: clear in-process locks between cases. */
export function resetTickLocks(): void {
  tickRunning = false;
  inFlight.clear();
}
