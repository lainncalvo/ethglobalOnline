// server-only — L5 backend. Do not import from client components.
import { cancelAuctionOnArc, getArcAuction, voidAwardOnArc } from "../arc";
import { ApiError, ErrorCode } from "../errors";
import { cancelOnHedera, getHederaAuction, isPresent } from "../hedera";
import { requireRef } from "../refs";
import { appendTimeline, nowIso, withStore } from "../store";
import { resolveId } from "../views";

export async function voidAuction(refRaw: string, reason: string) {
  const ref = requireRef(refRaw);
  if (!reason) {
    throw new ApiError(400, ErrorCode.INVALID_BODY, "reason is required");
  }
  const arcTxHash = await voidAwardOnArc(ref, reason);
  let hederaTxHash: string | undefined;
  const id = await resolveId(ref);
  if (id > 0n) {
    try {
      const hedera = await getHederaAuction(id);
      if (isPresent(hedera) && hedera.status === 1) {
        hederaTxHash = await cancelOnHedera(id);
      }
    } catch {
      // Hedera cancel is best-effort when the auction is already closed.
    }
  }
  await withStore((db) => {
    appendTimeline(db, ref, {
      step: "voided",
      chain: "arc",
      txHash: arcTxHash,
      at: nowIso(),
    });
  });
  return { arcTxHash, ...(hederaTxHash ? { hederaTxHash } : {}) };
}

export async function cancelAuction(refRaw: string) {
  const ref = requireRef(refRaw);
  let arcTxHash: string | undefined;
  let hederaTxHash: string | undefined;
  const arc = await getArcAuction(ref);
  if (arc.status === 1) {
    arcTxHash = await cancelAuctionOnArc(ref);
  }
  const id = await resolveId(ref);
  if (id > 0n) {
    const hedera = await getHederaAuction(id);
    if (isPresent(hedera) && hedera.status === 1) {
      hederaTxHash = await cancelOnHedera(id);
    }
  }
  await withStore((db) => {
    appendTimeline(db, ref, {
      step: "cancelled",
      chain: arcTxHash ? "arc" : "hedera",
      txHash: arcTxHash ?? hederaTxHash,
      at: nowIso(),
    });
  });
  return {
    ...(arcTxHash ? { arcTxHash } : {}),
    ...(hederaTxHash ? { hederaTxHash } : {}),
  };
}
