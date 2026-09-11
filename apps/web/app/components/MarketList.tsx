"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchAuctions } from "@/lib/api";
import { POLL_MS } from "@/lib/constants";
import { deadlineUnix } from "@/lib/format";
import { AuctionCard } from "./AuctionCard";

export function MarketList() {
  const { data, error, isPending } = useQuery({
    queryKey: ["auctions"],
    queryFn: fetchAuctions,
    refetchInterval: POLL_MS,
  });

  const auctions = [...(data?.auctions ?? [])].sort(
    (a, b) => deadlineUnix(a.deadline) - deadlineUnix(b.deadline),
  );

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
      {data?.mocked ? (
        <p className="banner-warn mb-4">API offline — showing sample data until L5 is up.</p>
      ) : null}
      {isPending ? <p className="muted">Loading auctions…</p> : null}
      {error ? <p className="banner-bad">{error.message}</p> : null}
      {!isPending && auctions.length === 0 ? (
        <p className="card">No exit auctions yet — list one at /sell</p>
      ) : (
        <div className="grid gap-3">
          {auctions.map((auction) => (
            <AuctionCard key={auction.ref} auction={auction} />
          ))}
        </div>
      )}
    </main>
  );
}
