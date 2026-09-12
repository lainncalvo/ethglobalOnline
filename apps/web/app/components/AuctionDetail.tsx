"use client";

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
import { OutcomeCard } from "./OutcomeCard";
import { Timeline } from "./Timeline";
import { WithdrawButton } from "./WithdrawButton";

function asHexRef(ref: string): Hex {
  return (ref.startsWith("0x") ? ref : `0x${ref}`) as Hex;
}

export function AuctionDetail({ auctionRef: rawRef }: { auctionRef: string }) {
  const auctionRef = asHexRef(rawRef);
  const { address } = useAccount();
  const { bidEscrow, usdc, bondToken } = getPublicAddresses();

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
      <main className="mx-auto max-w-[1200px] px-5 py-6">
        <p className="muted">Loading auction…</p>
      </main>
    );
  }

  if (auctionQuery.error || !detail) {
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-6">
        <p className="banner-bad">{auctionQuery.error?.message ?? "Auction not found"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-[1200px] gap-4 px-5 py-6">
      {auctionQuery.data?.mocked ? (
        <p className="banner-warn">API offline — sample auction until L5 is up.</p>
      ) : null}
      <p className="hash break-all muted">{auctionRef}</p>
      {token ? <BondFacts token={token} name={detail.tokenName} symbol={detail.tokenSymbol} /> : null}
      <Timeline detail={detail} />
      <OutcomeCard detail={detail} />
      <EligibilityBadge status={eligibility} />
      <BidsTable bids={bids} me={address} />
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
      <WithdrawButton auctionRef={auctionRef} escrow={bidEscrow} />
    </main>
  );
}
