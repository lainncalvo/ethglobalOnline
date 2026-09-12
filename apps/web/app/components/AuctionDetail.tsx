"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address, type Hex } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { bidEscrowAbi } from "@/lib/abi";
import { getPublicAddresses } from "@/lib/addresses";
import { fetchAuction, fetchCompliance } from "@/lib/api";
import { POLL_MS } from "@/lib/constants";
import { eligibilityLabel } from "@/lib/format";
import { pickListingHash } from "@/lib/outcome";
import { BidForm } from "./BidForm";
import { BidsTable } from "./BidsTable";
import { BondFacts } from "./BondFacts";
import { EligibilityBadge } from "./EligibilityBadge";
import { HederaBidForm } from "./HederaBidForm";
import { HederaBidsTable } from "./HederaBidsTable";
import { HederaWithdrawButton } from "./HederaWithdrawButton";
import { OutcomeCard } from "./OutcomeCard";
import { PaymentRailPicker, type PaymentRail } from "./PaymentRailPicker";
import { Timeline } from "./Timeline";
import { WithdrawButton } from "./WithdrawButton";

function asHexRef(ref: string): Hex {
  return (ref.startsWith("0x") ? ref : `0x${ref}`) as Hex;
}

export function AuctionDetail({ auctionRef: rawRef }: { auctionRef: string }) {
  const auctionRef = asHexRef(rawRef);
  const { address } = useAccount();
  const { bidEscrow, usdc, bondToken } = getPublicAddresses();
  const [rail, setRail] = useState<PaymentRail>("arc");

  const auctionQuery = useQuery({
    queryKey: ["auction", auctionRef],
    queryFn: () => fetchAuction(auctionRef),
    refetchInterval: POLL_MS,
  });

  const complianceQuery = useQuery({
    queryKey: ["compliance", address],
    queryFn: () => fetchCompliance(address!),
    enabled: Boolean(address),
    refetchInterval: POLL_MS,
  });

  const onchainBids = useReadContract({
    address: bidEscrow,
    abi: bidEscrowAbi,
    functionName: "getBids",
    args: [auctionRef],
    query: { enabled: Boolean(bidEscrow), refetchInterval: POLL_MS },
  });

  const detail = auctionQuery.data?.auction;
  const token = (detail && isAddress(detail.token) ? detail.token : bondToken) as Address | undefined;
  const bidsFromChain =
    onchainBids.data?.[0]?.map((bidder, i) => ({
      bidder,
      amount: onchainBids.data![1][i].toString(),
    })) ?? [];
  const bids = bidsFromChain.length > 0 ? bidsFromChain : (detail?.bids ?? []);
  const eligibility = complianceQuery.data;
  const blocked = Boolean(eligibility && !eligibility.canReceive);
  const blockReason = eligibility ? eligibilityLabel(eligibility).text : undefined;

  if (auctionQuery.isPending) {
    return (
      <main className="auction-workspace workspace-main">
        <section className="card auction-state" aria-live="polite">
          <p className="market-phase market-phase--open">Order book</p>
          <h1>Loading auction…</h1>
          <p className="muted">Reading the listing and settlement state.</p>
        </section>
      </main>
    );
  }

  if (auctionQuery.error || !detail) {
    return (
      <main className="auction-workspace workspace-main">
        <section className="card auction-state">
          <p className="market-phase market-phase--cancelled">Unavailable</p>
          <h1>Auction unavailable</h1>
          <p className="banner-bad">{auctionQuery.error?.message ?? "Auction not found"}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auction-workspace workspace-main">
      {auctionQuery.data?.mocked ? (
        <p className="banner-warn auction-workspace__notice">API offline — sample auction until L5 is up.</p>
      ) : null}
      <header className="auction-workspace__header">
        <div>
          <p className="market-phase market-phase--open">Live settlement workspace</p>
          <h1>{detail.tokenName || "Exit auction"}</h1>
          <p className="muted">Compliant bond exit · bids escrowed in USDC on Arc</p>
        </div>
        <p className="hash auction-workspace__reference">{auctionRef}</p>
      </header>

      <div className="auction-workspace__grid">
        <aside className="auction-workspace__facts" aria-label="Instrument facts">
          {token ? <BondFacts token={token} name={detail.tokenName} symbol={detail.tokenSymbol} /> : null}
        </aside>

        <div className="auction-workspace__market">
          <Timeline detail={detail} />
          <OutcomeCard detail={detail} />
          <BidsTable bids={bids} me={address} />
          <HederaBidsTable auctionRef={auctionRef} />
        </div>

        <aside className="auction-workspace__ticket" aria-label="Auction order entry">
          <div className="auction-workspace__ticket-stack">
            <EligibilityBadge status={eligibility} />
            <PaymentRailPicker value={rail} onChange={setRail} />
            {rail === "arc" ? (
            <BidForm
              auctionRef={auctionRef}
              escrow={bidEscrow}
              usdc={usdc}
              disabled={blocked || !address}
              reason={blocked ? blockReason : undefined}
              listingHash={pickListingHash(detail.timeline)}
              currentBid={
                address
                  ? bids.find((row) => row.bidder.toLowerCase() === address.toLowerCase())?.amount
                  : undefined
              }
            />
            ) : (
            <HederaBidForm
              auctionRef={auctionRef}
              disabled={blocked || !address}
              reason={blocked ? blockReason : undefined}
            />
            )}
            {rail === "arc" ? (
            <WithdrawButton auctionRef={auctionRef} escrow={bidEscrow} />
            ) : (
            <HederaWithdrawButton auctionRef={auctionRef} />
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
