// server-only — L5 backend. Do not import from client components.
import { isHex, type Hex } from "viem";
import { computeCommitment } from "../../../../packages/shared/src/commitment";
import { ApiError, ErrorCode } from "../errors";
import { getHederaAuction, isPresent } from "../hedera";
import { requireRef } from "../refs";
import { withStore } from "../store";
import { resolveId } from "../views";

export type ReserveDeps = {
  resolveId?: (ref: Hex) => Promise<bigint>;
  getAuction?: typeof getHederaAuction;
  persist?: typeof withStore;
};

export async function storeReserve(
  refRaw: string,
  body: { reserve?: string; salt?: string },
  deps: ReserveDeps = {},
): Promise<{ ok: true }> {
  const ref = requireRef(refRaw);
  if (!body.reserve || !body.salt) {
    throw new ApiError(400, ErrorCode.INVALID_BODY, "reserve and salt are required");
  }
  if (!isHex(body.salt) || body.salt.length !== 66) {
    throw new ApiError(400, ErrorCode.INVALID_BODY, "salt must be bytes32");
  }
  const id = await (deps.resolveId ?? resolveId)(ref);
  if (id === 0n) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "auction not found");
  }
  const auction = await (deps.getAuction ?? getHederaAuction)(id);
  if (!isPresent(auction)) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "auction not found");
  }
  let commitment: Hex;
  try {
    commitment = computeCommitment(body.reserve, body.salt as Hex);
  } catch {
    throw new ApiError(400, ErrorCode.INVALID_BODY, "invalid reserve or salt");
  }
  if (commitment.toLowerCase() !== auction.reserveCommitment.toLowerCase()) {
    throw new ApiError(
      409,
      ErrorCode.COMMITMENT_MISMATCH,
      "commitment does not match the on-chain reserveCommitment",
    );
  }
  await (deps.persist ?? withStore)((db) => {
    const current = db.auctions[ref] ?? {
      hederaAuctionId: id.toString(),
      timeline: [],
    };
    current.hederaAuctionId = id.toString();
    current.reserve = String(body.reserve);
    current.salt = body.salt;
    db.auctions[ref] = current;
  });
  return { ok: true };
}
