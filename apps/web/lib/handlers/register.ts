// server-only — L5 backend. Do not import from client components.
import { getAddress } from "viem";
import { getArcAuction, registerOnArc } from "../arc";
import { ApiError, ErrorCode } from "../errors";
import { getHederaAuction, isPresent, refFor } from "../hedera";
import { appendTimeline, nowIso, withStore } from "../store";

export async function registerAuction(hederaAuctionIdRaw: string | number) {
  const id = BigInt(hederaAuctionIdRaw);
  if (id <= 0n) {
    throw new ApiError(400, ErrorCode.INVALID_BODY, "hederaAuctionId is required");
  }
  let auction;
  try {
    auction = await getHederaAuction(id);
  } catch {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "hedera auction not found");
  }
  if (!isPresent(auction) || auction.status !== 1) {
    throw new ApiError(
      auction.status === 0 ? 404 : 409,
      auction.status === 0 ? ErrorCode.NOT_FOUND : ErrorCode.AUCTION_NOT_OPEN,
      "hedera auction is not Open",
    );
  }
  const now = Math.floor(Date.now() / 1000);
  if (Number(auction.deadline) <= now) {
    throw new ApiError(409, ErrorCode.AFTER_DEADLINE, "auction deadline has passed");
  }
  const ref = auction.ref && auction.ref.length === 66 ? auction.ref : refFor(id);
  const arc = await getArcAuction(ref);
  if (arc.status === 1) {
    return { ref, alreadyRegistered: true as const };
  }
  if (arc.status !== 0) {
    throw new ApiError(
      409,
      ErrorCode.BAD_STATUS,
      "arc auction is not available to register",
    );
  }
  const arcTxHash = await registerOnArc({
    ref,
    seller: getAddress(auction.seller),
    deadline: auction.deadline,
    reserveCommitment: auction.reserveCommitment,
    hederaAuctionId: id,
  });
  await withStore((db) => {
    appendTimeline(
      db,
      ref,
      { step: "registered", chain: "arc", txHash: arcTxHash, at: nowIso() },
      id.toString(),
    );
  });
  return { ref, arcTxHash };
}
