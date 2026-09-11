// server-only — L5 backend. Do not import from client components.
import { getAddress, type Hex } from "viem";
import type { Snapshot } from "../../../packages/shared/src/award";
import { getArcAuction, getArcBids } from "./arc";
import { ApiError, ErrorCode } from "./errors";
import { getHederaAuction, isPresent } from "./hedera";
import { loadConfig } from "./server-config";
import { readStore } from "./store";
import { resolveId } from "./views";

export async function buildSnapshot(ref: Hex): Promise<Snapshot> {
  const record = await readStore((db) => db.auctions[ref]);
  if (!record?.reserve || !record.salt) {
    throw new ApiError(404, ErrorCode.NO_RESERVE, "sealed reserve is not stored");
  }
  const id = await resolveId(ref);
  if (id === 0n) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "auction not found");
  }
  const hedera = await getHederaAuction(id);
  if (!isPresent(hedera)) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "auction not found");
  }
  const [arc, bids] = await Promise.all([getArcAuction(ref), getArcBids(ref)]);
  const token = hedera.token || loadConfig().bondToken;
  if (!token) {
    throw new ApiError(500, ErrorCode.CONFIG, "bond token is not configured");
  }
  return {
    ref,
    deadline: Number(hedera.deadline || arc.deadline),
    seller: getAddress(hedera.seller),
    reserveCommitment: hedera.reserveCommitment,
    bids: bids.map((b) => ({
      bidder: getAddress(b.bidder),
      amount: b.amount.toString(),
    })),
    reserve: { value: record.reserve, salt: record.salt as Hex },
    hedera: {
      token: getAddress(token),
      partition: hedera.partition,
      amount: hedera.amount.toString(),
      seller: getAddress(hedera.seller),
      auctionId: id.toString(),
    },
  };
}
