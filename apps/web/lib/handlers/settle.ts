// server-only — L5 backend. Do not import from client components.
import { getAddress } from "viem";
import {
  arcStatusName,
  confirmDeliveryOnArc,
  getArcAuction,
  voidAwardOnArc,
} from "../arc";
import { asByteCode, reasonText } from "../eip1066";
import { ApiError, ErrorCode } from "../errors";
import {
  cancelOnHedera,
  previewSettleOnchain,
  settleOnHedera,
} from "../hedera";
import { requireRef } from "../refs";
import { decodeRevertName, extractTxHash } from "../revert";
import { parseAddress } from "../server-config";
import { appendTimeline, nowIso, withStore } from "../store";
import { resolveId } from "../views";

export type SettleDeps = {
  getArcAuction?: typeof getArcAuction;
  resolveId?: typeof resolveId;
  settleOnHedera?: typeof settleOnHedera;
  confirmDelivery?: typeof confirmDeliveryOnArc;
  voidAward?: typeof voidAwardOnArc;
  cancelOnHedera?: typeof cancelOnHedera;
};

export async function settleAuction(refRaw: string, deps: SettleDeps = {}) {
  const ref = requireRef(refRaw);
  const arc = await (deps.getArcAuction ?? getArcAuction)(ref);
  if (arc.status !== 2) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      `arc status is ${arcStatusName(arc.status)}`,
    );
  }
  const id = await (deps.resolveId ?? resolveId)(ref);
  if (id === 0n) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "hedera auction id not found");
  }
  const winner = getAddress(arc.winner);
  try {
    const hederaTxHash = await (deps.settleOnHedera ?? settleOnHedera)(id, winner);
    const arcTxHash = await (deps.confirmDelivery ?? confirmDeliveryOnArc)(
      ref,
      hederaTxHash,
    );
    await withStore((db) => {
      appendTimeline(db, ref, {
        step: "settled",
        chain: "hedera",
        txHash: hederaTxHash,
        at: nowIso(),
      });
      appendTimeline(db, ref, {
        step: "delivery-confirmed",
        chain: "arc",
        txHash: arcTxHash,
        at: nowIso(),
      });
    });
    return { hederaTxHash, arcTxHash };
  } catch (err) {
    const reason = decodeRevertName(err);
    const hederaTxHash = extractTxHash(err);
    let arcTxHash: string | undefined;
    try {
      arcTxHash = await (deps.voidAward ?? voidAwardOnArc)(ref, reason);
      await (deps.cancelOnHedera ?? cancelOnHedera)(id);
    } catch {
      // void/cancel best-effort after a failed settle
    }
    await withStore((db) => {
      appendTimeline(db, ref, {
        step: "voided",
        chain: "arc",
        txHash: arcTxHash,
        at: nowIso(),
      });
    });
    return {
      voided: true as const,
      reason,
      ...(hederaTxHash ? { hederaTxHash } : {}),
    };
  }
}

export async function settlePreview(refRaw: string, toRaw: string) {
  const ref = requireRef(refRaw);
  const to = parseAddress(toRaw, "to");
  const id = await resolveId(ref);
  if (id === 0n) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "auction not found");
  }
  const preview = await previewSettleOnchain(id, to);
  const code = asByteCode(preview.code);
  return {
    ok: preview.ok,
    code,
    reasonText: reasonText(preview.ok, code, preview.reason),
  };
}
