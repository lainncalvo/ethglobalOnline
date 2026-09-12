// server-only — Hedera USDC bid rail. Do not import from client components.
import { getAddress, type Hex } from "viem";
import {
  computeAward,
  CommitmentMismatch,
  type Award,
  type Snapshot,
} from "../../../../packages/shared/src/award";
import { cancelAuctionOnArc, getArcAuction } from "../arc";
import { ApiError, ErrorCode } from "../errors";
import {
  awardByOperatorOnHederaRail,
  cancelHederaRail,
  confirmDeliveryOnHederaRail,
  getHederaRailAuction,
  getHederaRailBids,
  hederaRailStatusName,
  registerOnHederaRail,
  voidHederaRail,
} from "../hedera-escrow";
import {
  cancelOnHedera,
  getHederaAuction,
  isPresent,
  settleOnHedera,
} from "../hedera";
import { requireRef } from "../refs";
import { decodeRevertName, extractTxHash } from "../revert";
import { screenCandidates } from "../screening";
import { loadConfig } from "../server-config";
import { appendTimeline, nowIso, readStore, withStore } from "../store";
import { resolveId } from "../views";

function publicAward(award: Award) {
  return {
    outcome: award.outcome,
    winner: award.winner,
    clearingPrice: award.clearingPrice.toString(),
    eligible: award.eligible,
  };
}

async function loadOpenListing(ref: Hex) {
  const id = await resolveId(ref);
  if (id === 0n) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "hedera auction id not found");
  }
  const listing = await getHederaAuction(id);
  if (!isPresent(listing) || listing.status !== 1) {
    throw new ApiError(
      listing.status === 0 ? 404 : 409,
      listing.status === 0 ? ErrorCode.NOT_FOUND : ErrorCode.AUCTION_NOT_OPEN,
      "hedera auction is not Open",
    );
  }
  return { id, listing };
}

export async function registerHederaRail(refRaw: string) {
  const ref = requireRef(refRaw);
  const { id, listing } = await loadOpenListing(ref);
  const current = await getHederaRailAuction(ref);
  if (current.status === 1) {
    return { ref, alreadyRegistered: true as const };
  }
  if (current.status !== 0) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      `hedera escrow status is ${hederaRailStatusName(current.status)}`,
    );
  }
  const txHash = await registerOnHederaRail({
    ref,
    seller: getAddress(listing.seller),
    deadline: listing.deadline,
    reserveCommitment: listing.reserveCommitment,
    hederaAuctionId: id,
  });
  await withStore((db) => {
    appendTimeline(
      db,
      ref,
      { step: "hedera-registered", chain: "hedera", txHash, at: nowIso() },
      id.toString(),
    );
  });
  return { ref, hederaTxHash: txHash };
}

export async function closeHederaRail(refRaw: string) {
  const ref = requireRef(refRaw);
  const escrow = await getHederaRailAuction(ref);
  if (escrow.status !== 1) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      `hedera escrow status is ${hederaRailStatusName(escrow.status)}`,
    );
  }
  const now = Math.floor(Date.now() / 1000);
  if (now < Number(escrow.deadline)) {
    throw new ApiError(409, ErrorCode.BEFORE_DEADLINE, "deadline has not been reached");
  }

  const record = await readStore((db) => db.auctions[ref]);
  if (!record?.reserve || !record.salt) {
    throw new ApiError(404, ErrorCode.NO_RESERVE, "sealed reserve is not stored");
  }
  const id = await resolveId(ref);
  const listing = id > 0n ? await getHederaAuction(id) : undefined;
  const bondToken = loadConfig().bondToken;
  const bids = await getHederaRailBids(ref);
  const snapshot: Snapshot = {
    ref,
    deadline: Number(escrow.deadline),
    seller: getAddress(escrow.seller),
    reserveCommitment: escrow.reserveCommitment,
    bids: bids.map((b) => ({
      bidder: getAddress(b.bidder),
      amount: b.amount.toString(),
    })),
    reserve: { value: record.reserve, salt: record.salt as Hex },
    hedera: {
      token: listing
        ? getAddress(listing.token)
        : bondToken ?? getAddress(escrow.seller),
      partition: listing?.partition ??
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      amount: listing ? listing.amount.toString() : "0",
      seller: getAddress(escrow.seller),
      auctionId: id.toString(),
    },
  };

  const screening = await screenCandidates({
    token: snapshot.hedera.token,
    seller: snapshot.hedera.seller,
    partition: snapshot.hedera.partition,
    amount: snapshot.hedera.amount,
    candidates: snapshot.bids.map((b) => b.bidder),
  });

  let award: Award;
  try {
    award = computeAward(snapshot, screening);
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

  const hederaTxHash = await awardByOperatorOnHederaRail({
    ref,
    winner: award.winner,
    clearingPrice: award.clearingPrice,
    reserveCommitment: award.reserveCommitment,
    outcome: award.outcome,
    bidsDigest: award.bidsDigest,
  });

  let arcTxHash: string | undefined;
  if (award.outcome === 1) {
    try {
      const arc = await getArcAuction(ref);
      if (arc.status === 1) {
        arcTxHash = await cancelAuctionOnArc(ref);
      }
    } catch {
      // Arc cancel is best-effort so a Hedera award still lands.
    }
  }

  await withStore((db) => {
    appendTimeline(db, ref, {
      step: "hedera-awarded",
      chain: "hedera",
      txHash: hederaTxHash,
      at: nowIso(),
    });
  });

  return {
    hederaTxHash,
    arcTxHash,
    award: publicAward(award),
  };
}

export type SettleHederaOpts = { onFailure?: "void" | "rethrow" };

export async function settleHederaRail(
  refRaw: string,
  opts: SettleHederaOpts = {},
) {
  const onFailure = opts.onFailure ?? "void";
  const ref = requireRef(refRaw);
  const escrow = await getHederaRailAuction(ref);
  if (escrow.status !== 2) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      `hedera escrow status is ${hederaRailStatusName(escrow.status)}`,
    );
  }
  const id = await resolveId(ref);
  if (id === 0n) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "hedera auction id not found");
  }
  const winner = getAddress(escrow.winner);
  try {
    const hederaTxHash = await settleOnHedera(id, winner);
    const payTxHash = await confirmDeliveryOnHederaRail(ref, hederaTxHash);
    await withStore((db) => {
      appendTimeline(db, ref, {
        step: "settled",
        chain: "hedera",
        txHash: hederaTxHash,
        at: nowIso(),
      });
      appendTimeline(db, ref, {
        step: "hedera-delivery-confirmed",
        chain: "hedera",
        txHash: payTxHash,
        at: nowIso(),
      });
    });
    return { hederaTxHash, payTxHash };
  } catch (err) {
    if (onFailure === "rethrow") throw err;
    const reason = decodeRevertName(err);
    const hederaTxHash = extractTxHash(err);
    let voidTxHash: string | undefined;
    try {
      voidTxHash = await voidHederaRail(ref, reason);
      await cancelOnHedera(id);
    } catch {
      // void/cancel best-effort after a failed settle
    }
    await withStore((db) => {
      appendTimeline(db, ref, {
        step: "hedera-voided",
        chain: "hedera",
        txHash: voidTxHash,
        at: nowIso(),
      });
    });
    return { voided: true as const, reason, hederaTxHash, voidTxHash };
  }
}

export async function cancelHederaRailAuction(refRaw: string) {
  const ref = requireRef(refRaw);
  const escrow = await getHederaRailAuction(ref);
  if (escrow.status !== 1) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      `hedera escrow status is ${hederaRailStatusName(escrow.status)}`,
    );
  }
  const txHash = await cancelHederaRail(ref);
  await withStore((db) => {
    appendTimeline(db, ref, {
      step: "hedera-cancelled",
      chain: "hedera",
      txHash,
      at: nowIso(),
    });
  });
  return { hederaTxHash: txHash };
}
