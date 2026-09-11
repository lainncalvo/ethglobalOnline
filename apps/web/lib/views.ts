// server-only — L5 backend. Do not import from client components.
import { getAddress, type Hex } from "viem";
import {
  arcscanAddress,
  hashscanContract,
} from "../../../packages/shared/src/chains";
import { requireRef } from "./refs";
import type { ArcAuction, BidRowOnchain } from "./arc";
import { arcStatusName, awardSourceName, getArcAuction, getArcBids } from "./arc";
import {
  getHederaAuction,
  getHederaAuctions,
  hederaStatusName,
  idByRef,
  isPresent,
  refFor,
  tokenMeta,
  type HederaAuction,
} from "./hedera";
import { ApiError, ErrorCode } from "./errors";
import { loadConfig } from "./server-config";
import { publicRecord, readStore } from "./store";
import type { AuctionDetail, AuctionView, TimelineEntry } from "./types";

const ZERO = "0x0000000000000000000000000000000000000000";

function checksumOrNull(address: string | undefined): string | null {
  if (!address || address.toLowerCase() === ZERO) return null;
  try {
    return getAddress(address);
  } catch {
    return null;
  }
}

function links(token: string | undefined) {
  const cfg = loadConfig();
  return {
    hashscanAuction: cfg.exitAuction
      ? hashscanContract(cfg.exitAuction)
      : "",
    hashscanToken: token && token !== ZERO ? hashscanContract(token) : "",
    arcscanEscrow: cfg.bidEscrow ? arcscanAddress(cfg.bidEscrow) : "",
  };
}

export function toAuctionView(
  hedera: HederaAuction | undefined,
  arc: ArcAuction,
  bids: BidRowOnchain[],
  meta: { name: string; symbol: string },
  hederaAuctionId: string,
  ref: Hex,
): AuctionView {
  const top = bids.reduce<bigint | null>((max, row) => {
    if (max === null || row.amount > max) return row.amount;
    return max;
  }, null);
  const winner = checksumOrNull(hedera?.winner ?? arc.winner);
  const clearing =
    arc.clearingPrice > 0n ? arc.clearingPrice.toString() : null;
  return {
    ref,
    hederaAuctionId,
    token: hedera ? getAddress(hedera.token) : "",
    tokenName: meta.name,
    tokenSymbol: meta.symbol,
    seller: getAddress((hedera?.seller || arc.seller) as string),
    amount: (hedera?.amount ?? 0n).toString(),
    deadline: (hedera?.deadline ?? arc.deadline).toString(),
    hederaStatus: (hedera
      ? hederaStatusName(hedera.status)
      : "Open") as AuctionView["hederaStatus"],
    arcStatus: arcStatusName(arc.status),
    topBid: top === null ? null : top.toString(),
    bidCount: String(bids.length),
    winner,
    clearingPrice: clearing,
    awardSource: awardSourceName(arc.source),
    links: links(hedera?.token),
  };
}

export async function resolveId(ref: Hex): Promise<bigint> {
  const fromChain = await idByRef(ref);
  if (fromChain > 0n) return fromChain;
  const stored = await readStore((db) => db.auctions[ref]?.hederaAuctionId);
  if (stored) return BigInt(stored);
  const arc = await getArcAuction(ref);
  if (arc.hederaAuctionId > 0n) return arc.hederaAuctionId;
  return 0n;
}

export async function loadAuctionDetail(rawRef: string): Promise<AuctionDetail> {
  const ref = requireRef(rawRef);
  const id = await resolveId(ref);
  let hedera: HederaAuction | undefined;
  if (id > 0n) {
    const fetched = await getHederaAuction(id);
    if (isPresent(fetched)) hedera = fetched;
  }
  const [arc, bids, record] = await Promise.all([
    getArcAuction(ref),
    getArcBids(ref),
    readStore((db) => publicRecord(db.auctions[ref])),
  ]);
  if (!hedera && arc.status === 0) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, "auction not found");
  }
  const meta = hedera
    ? await tokenMeta(hedera.token)
    : { name: "ATS Bond", symbol: "BOND" };
  const view = toAuctionView(
    hedera,
    arc,
    bids,
    meta,
    id > 0n ? id.toString() : (record?.hederaAuctionId ?? "0"),
    ref,
  );
  const timeline: TimelineEntry[] = record?.timeline ?? [];
  return {
    ...view,
    bids: bids.map((b) => ({
      bidder: getAddress(b.bidder),
      amount: b.amount.toString(),
    })),
    clearingPrice: view.clearingPrice,
    hederaTxHash:
      arc.hederaTxHash &&
      arc.hederaTxHash !==
        "0x0000000000000000000000000000000000000000000000000000000000000000"
        ? arc.hederaTxHash
        : null,
    timeline,
  };
}

export async function loadAuctionList(): Promise<AuctionView[]> {
  const hederaAuctions = await getHederaAuctions();
  const views = await Promise.all(
    hederaAuctions.map(async (auction) => {
      const ref = auction.ref && auction.ref !== "0x" ? auction.ref : refFor(auction.id);
      const [arc, bids, meta] = await Promise.all([
        getArcAuction(ref),
        getArcBids(ref),
        tokenMeta(auction.token),
      ]);
      return toAuctionView(auction, arc, bids, meta, auction.id.toString(), ref);
    }),
  );
  return views.sort((a, b) => Number(b.deadline) - Number(a.deadline));
}
