// server-only — L5 backend. Do not import from client components.
import {
  computeAward,
  CommitmentMismatch,
  type Award,
} from "../../../../packages/shared/src/award";
import { awardByOperatorOnArc, getArcAuction, arcStatusName } from "../arc";
import { ApiError, ErrorCode } from "../errors";
import { requireRef } from "../refs";
import { loadConfig } from "../server-config";
import { screenCandidates } from "../screening";
import { buildSnapshot } from "../snapshot";
import { appendTimeline, nowIso, withStore } from "../store";

export type CloseDeps = {
  now?: () => number;
  awardMode?: "cre" | "local";
  triggerCre?: (ref: string) => Promise<void>;
  computeAwardFn?: typeof computeAward;
  awardByOperator?: typeof awardByOperatorOnArc;
  getArcAuction?: typeof getArcAuction;
  buildSnapshot?: typeof buildSnapshot;
  screen?: typeof screenCandidates;
};

async function postCreTrigger(ref: string): Promise<void> {
  const url = loadConfig().creTriggerUrl;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ref }),
  });
  if (!res.ok) {
    throw new ApiError(
      502,
      ErrorCode.CRE_TRIGGER_FAILED,
      "CRE trigger did not accept the request",
    );
  }
}

function publicAward(award: Award) {
  return {
    outcome: award.outcome,
    winner: award.winner,
    clearingPrice: award.clearingPrice.toString(),
    eligible: award.eligible,
  };
}

export async function closeAuction(
  refRaw: string,
  opts: { forceLocal?: boolean } = {},
  deps: CloseDeps = {},
) {
  const ref = requireRef(refRaw);
  const arc = await (deps.getArcAuction ?? getArcAuction)(ref);
  if (arc.status !== 1) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      `arc status is ${arcStatusName(arc.status)}`,
    );
  }
  const now = (deps.now ?? (() => Math.floor(Date.now() / 1000)))();
  if (now < Number(arc.deadline)) {
    throw new ApiError(409, ErrorCode.BEFORE_DEADLINE, "deadline has not been reached");
  }

  const mode: "cre" | "local" =
    opts.forceLocal || (deps.awardMode ?? loadConfig().awardMode) === "local"
      ? "local"
      : "cre";

  if (mode === "cre") {
    await (deps.triggerCre ?? postCreTrigger)(ref);
    await withStore((db) => {
      appendTimeline(db, ref, {
        step: "close-cre",
        chain: "arc",
        at: nowIso(),
      });
    });
    return { mode: "cre" as const, accepted: true };
  }

  // TODO(L4): packages/shared/src/award.ts is the only award engine.
  // If that module is absent, close-local cannot run — do not reimplement it here.
  if (!deps.computeAwardFn && !computeAward) {
    throw new ApiError(
      503,
      ErrorCode.AWARD_ENGINE_UNAVAILABLE,
      "award engine is not present",
    );
  }

  const snapshot = await (deps.buildSnapshot ?? buildSnapshot)(ref);
  const screening = await (deps.screen ?? screenCandidates)({
    token: snapshot.hedera.token,
    seller: snapshot.hedera.seller,
    partition: snapshot.hedera.partition,
    amount: snapshot.hedera.amount,
    candidates: snapshot.bids.map((b) => b.bidder),
  });

  let award: Award;
  try {
    award = (deps.computeAwardFn ?? computeAward)(snapshot, screening);
  } catch (err) {
    if (err instanceof CommitmentMismatch) {
      throw new ApiError(
        409,
        ErrorCode.COMMITMENT_MISMATCH,
        "sealed reserve does not match the on-chain commitment",
      );
    }
    throw err;
  }

  const write = deps.awardByOperator ?? awardByOperatorOnArc;
  const arcTxHash = await write({
    ref,
    winner: award.winner,
    clearingPrice: award.clearingPrice,
    reserveCommitment: award.reserveCommitment,
    outcome: award.outcome,
    bidsDigest: award.bidsDigest,
  });
  await withStore((db) => {
    appendTimeline(db, ref, {
      step: "awarded",
      chain: "arc",
      txHash: arcTxHash,
      at: nowIso(),
    });
  });
  return {
    mode: "local" as const,
    arcTxHash,
    award: publicAward(award),
  };
}
