import Link from "next/link";
import { marketPhase } from "@/lib/market";
import type { AuctionView } from "@/lib/types";
import { Address } from "./Address";
import { UsdcAmount } from "./Amount";
import { Countdown } from "./Countdown";

export function AuctionCard({ auction, nowMs }: { auction: AuctionView; nowMs?: number }) {
  const phase = marketPhase(auction, nowMs);
  return (
    <article className="card market-auction">
      <div className="market-auction__main">
        <div className="market-auction__identity">
          <p className="market-auction__eyebrow">Lot {auction.hederaAuctionId}</p>
          <h2 className="market-auction__title">
            <Link href={`/auction/${auction.ref}`}>{auction.tokenName}</Link>
            <span>{auction.tokenSymbol}</span>
          </h2>
          <p className="market-auction__position">
            <span className="data-value">
              {auction.amount} {auction.tokenSymbol}
            </span>
            <span className="market-auction__separator" aria-hidden="true">
              /
            </span>
            <span className="market-auction__seller">
              seller <Address value={auction.seller} />
            </span>
          </p>
        </div>
        <div className="market-auction__phase">
          <p className="market-phase">{phase}</p>
          <Countdown deadline={auction.deadline} />
        </div>
      </div>

      <dl className="market-auction__metrics">
        <div className="market-auction__metric">
          <dt>Hedera</dt>
          <dd>{auction.hederaStatus}</dd>
        </div>
        <div className="market-auction__metric">
          <dt>Arc</dt>
          <dd>{auction.arcStatus}</dd>
        </div>
        <div className="market-auction__metric market-auction__metric--price">
          <dt>Top bid</dt>
          <dd>{auction.topBid ? <UsdcAmount value={auction.topBid} /> : "—"}</dd>
        </div>
        <div className="market-auction__metric">
          <dt>Bids</dt>
          <dd className="data-value">{auction.bidCount}</dd>
        </div>
      </dl>

      <footer className="market-auction__actions">
        <Link href={`/auction/${auction.ref}`} className="btn btn-primary no-underline">
          Open auction
        </Link>
        <a
          href={auction.links.hashscanAuction}
          target="_blank"
          rel="noreferrer"
          className="market-auction__explorer"
        >
          HashScan auction
          <span aria-hidden="true">↗</span>
        </a>
        <a
          href={auction.links.arcscanEscrow}
          target="_blank"
          rel="noreferrer"
          className="market-auction__explorer"
        >
          ArcScan escrow
          <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </article>
  );
}
