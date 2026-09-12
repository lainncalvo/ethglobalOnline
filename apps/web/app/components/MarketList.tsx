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

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1>Exit auctions</h1>
          <p className="muted">Hedera ATS bonds · cash leg in USDC on Arc</p>
        </div>
        <Link href="/sell" className="btn btn-primary no-underline">
          List a bond
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Auction status">
        {MARKET_FILTERS.map((item) => {
          const count = item.id === "open" ? openCount : item.id === "closed" ? closedCount : sorted.length;
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? "btn btn-primary" : "btn"}
              onClick={() => setFilter(item.id)}
            >
              {item.label} ({count})
            </button>
          );
        })}
      </div>
      {data?.mocked ? (
        <p className="banner-warn mb-4">API offline — showing sample data until L5 is up.</p>
      ) : null}
      {isPending ? <p className="muted">Loading auctions…</p> : null}
      {error ? <p className="banner-bad">{error.message}</p> : null}
      {!isPending && auctions.length === 0 ? (
        <p className="card">{EMPTY[filter]}</p>
      ) : (
        <div className="grid gap-3">
          {auctions.map((auction) => (
            <AuctionCard key={auction.ref} auction={auction} nowMs={nowMs} />
          ))}
        </div>
      )}
    </main>
  );
}
