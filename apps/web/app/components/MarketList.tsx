"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchAuctions } from "@/lib/api";
import { POLL_MS } from "@/lib/constants";
import { deadlineUnix } from "@/lib/format";
import { filterAuctions, MARKET_FILTERS, type MarketFilter } from "@/lib/market";
import { AuctionCard } from "./AuctionCard";

const EMPTY: Record<MarketFilter, string> = {
  open: "No open auctions — list one at /sell",
  closed: "No closed auctions yet.",
  all: "No exit auctions yet — list one at /sell",
};

export function MarketList() {
  const [filter, setFilter] = useState<MarketFilter>("open");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { data, error, isPending } = useQuery({
    queryKey: ["auctions"],
    queryFn: fetchAuctions,
    refetchInterval: POLL_MS,
  });

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...(data?.auctions ?? [])].sort(
    (a, b) => deadlineUnix(a.deadline) - deadlineUnix(b.deadline),
  );
  const auctions = filterAuctions(sorted, filter, nowMs);
  const openCount = filterAuctions(sorted, "open", nowMs).length;
  const closedCount = filterAuctions(sorted, "closed", nowMs).length;
  const bidCount = sorted
    .reduce((total, auction) => total + BigInt(auction.bidCount), 0n)
    .toString();

  return (
    <main className="market-workspace">
      <header className="market-heading">
        <div className="market-heading__copy">
          <p className="market-eyebrow">Secondary market</p>
          <h1>Exit auctions</h1>
          <p className="market-context">Hedera ATS bonds · cash leg in USDC on Arc</p>
        </div>
        <Link href="/sell" className="btn btn-primary no-underline">
          List a bond
        </Link>
      </header>

      <dl className="market-metrics" aria-label="Market summary">
        <div className="market-metric">
          <dt>Open lots</dt>
          <dd>{openCount}</dd>
        </div>
        <div className="market-metric">
          <dt>Closed lots</dt>
          <dd>{closedCount}</dd>
        </div>
        <div className="market-metric">
          <dt>Total bids</dt>
          <dd>{bidCount}</dd>
        </div>
      </dl>

      <div className="market-toolbar">
        <div className="market-tabs" role="tablist" aria-label="Auction status">
          {MARKET_FILTERS.map((item) => {
            const count =
              item.id === "open"
                ? openCount
                : item.id === "closed"
                  ? closedCount
                  : sorted.length;
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                id={`market-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="market-auction-list"
                className="market-tab"
                onClick={() => setFilter(item.id)}
              >
                <span>{item.label}</span>
                <span className="market-tab__count">{count}</span>
              </button>
            );
          })}
        </div>
        <p className="market-toolbar__label">{auctions.length} visible</p>
      </div>

      <section
        id="market-auction-list"
        role="tabpanel"
        aria-labelledby={`market-tab-${filter}`}
        className="market-results"
      >
        {data?.mocked ? (
          <p className="banner-warn market-notice">
            API offline — showing sample data until L5 is up.
          </p>
        ) : null}
        {isPending ? (
          <p className="market-state market-state--loading" role="status">
            <span className="market-state__pulse" aria-hidden="true" />
            Loading auctions…
          </p>
        ) : null}
        {error ? <p className="banner-bad market-notice">{error.message}</p> : null}
        {!isPending && auctions.length === 0 ? (
          <p className="market-state">{EMPTY[filter]}</p>
        ) : (
          <div className="market-auctions">
            {auctions.map((auction) => (
              <AuctionCard key={auction.ref} auction={auction} nowMs={nowMs} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
