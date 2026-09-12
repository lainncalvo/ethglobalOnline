import Link from "next/link";
import { marketPhase } from "@/lib/market";
import type { AuctionView } from "@/lib/types";
import { Address } from "./Address";
import { UsdcAmount } from "./Amount";
import { Countdown } from "./Countdown";

export function AuctionCard({ auction, nowMs }: { auction: AuctionView; nowMs?: number }) {
  const phase = marketPhase(auction, nowMs);
  return (
    <article className="card grid gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2>
            {auction.tokenName}{" "}
            <span className="muted text-[18px] font-medium">{auction.tokenSymbol}</span>
          </h2>
          <p className="muted">
            {auction.amount} {auction.tokenSymbol} · seller <Address value={auction.seller} />
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{phase}</p>
          <Countdown deadline={auction.deadline} />
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-3 text-sm">
        <div>
          <dt className="muted">Hedera</dt>
          <dd className="font-semibold">{auction.hederaStatus}</dd>
        </div>
        <div>
          <dt className="muted">Arc</dt>
          <dd className="font-semibold">{auction.arcStatus}</dd>
        </div>
        <div>
          <dt className="muted">Top bid</dt>
          <dd className="font-semibold">
            {auction.topBid ? <UsdcAmount value={auction.topBid} /> : "—"}
          </dd>
        </div>
        <div>
          <dt className="muted">Bids</dt>
          <dd className="font-semibold">{auction.bidCount}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link href={`/auction/${auction.ref}`} className="btn btn-primary no-underline">
          Open auction
        </Link>
        <a href={auction.links.hashscanAuction} target="_blank" rel="noreferrer">
          HashScan auction
        </a>
        <a href={auction.links.arcscanEscrow} target="_blank" rel="noreferrer">
          ArcScan escrow
        </a>
      </div>
    </article>
  );
}
