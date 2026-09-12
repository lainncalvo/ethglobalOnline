// server-only — L5 backend. Do not import from client components.
import { getAddress } from "viem";
import {
  arcStatusName,
  confirmDeliveryOnArc,
  getArcAuction,
  voidAwardOnArc,
} from "../arc";
import { reasonText } from "../eip1066";
import { ApiError, ErrorCode } from "../errors";
import {
  cancelOnHedera,
  getHederaAuction,
  isPresent,
  settleOnHedera,
} from "../hedera";
import { requireRef } from "../refs";
import { decodeRevertName, extractTxHash } from "../revert";
import { screenCandidate } from "../screening";
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

export type SettleOpts = SettleDeps & { onFailure?: "void" | "rethrow" };

export async function settleAuction(refRaw: string, opts: SettleOpts = {}) {
  const onFailure = opts.onFailure ?? "void";
  const ref = requireRef(refRaw);
  const arc = await (opts.getArcAuction ?? getArcAuction)(ref);
  if (arc.status !== 2) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      `arc status is ${arcStatusName(arc.status)}`,
    );
  }
  const id = await (opts.resolveId ?? resolveId)(ref);
  if (id === 0n) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "hedera auction id not found");
  }
  const winner = getAddress(arc.winner);
  try {
    const hederaTxHash = await (opts.settleOnHedera ?? settleOnHedera)(id, winner);
    const arcTxHash = await (opts.confirmDelivery ?? confirmDeliveryOnArc)(
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
    if (onFailure === "rethrow") throw err;
    const reason = decodeRevertName(err);
    const hederaTxHash = extractTxHash(err);
    let arcTxHash: string | undefined;
    try {
      arcTxHash = await (opts.voidAward ?? voidAwardOnArc)(ref, reason);
      await (opts.cancelOnHedera ?? cancelOnHedera)(id);
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
  const auction = await getHederaAuction(id);
  if (!isPresent(auction)) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "auction not found");
  }
  // ExitAuction.previewSettle runs with the contract as msg.sender, which ATS
  // reads as an unlisted caller and blocks every recipient. Screen from the
  // seller, the holder whose balance moves at executeHoldByPartition time.
  const row = await screenCandidate(
    auction.token,
    auction.seller,
    auction.partition,
    auction.amount,
    to,
  );
  return {
    ok: row.canTransfer,
    code: row.code,
    reasonText: reasonText(row.canTransfer, row.code, row.reason),
  };
}
