"use client";

import { isAddressEqual, type Hex } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { bidEscrowAbi } from "@/lib/abi";
import { HEDERA_CHAIN_ID } from "@/lib/constants";
import { getHederaRailAddresses } from "@/lib/hedera-addresses";
import { Address } from "./Address";
import { UsdcAmount } from "./Amount";

export function HederaBidsTable({ auctionRef }: { auctionRef: Hex }) {
  const { address: me } = useAccount();
  const { hederaBidEscrow: escrow } = getHederaRailAddresses();
  const onchainBids = useReadContract({
    address: escrow,
    abi: bidEscrowAbi,
    functionName: "getBids",
    args: [auctionRef],
    chainId: HEDERA_CHAIN_ID,
    query: { enabled: Boolean(escrow), refetchInterval: 5_000 },
  });

  const bids =
    onchainBids.data?.[0]?.map((bidder, i) => ({
      bidder,
      amount: onchainBids.data![1][i].toString(),
    })) ?? [];

  if (!escrow) return null;

  if (bids.length === 0) {
    return (
      <section className="card order-book order-book--empty">
        <div className="section-heading">
          <div>
            <p className="market-phase">Hedera escrow</p>
            <h2>Hedera bids</h2>
          </div>
          <span className="status-indicator">0 orders</span>
        </div>
        <p className="muted">No Hedera USDC bids yet.</p>
      </section>
    );
  }

  return (
    <section className="card order-book">
      <div className="section-heading">
        <div>
          <p className="market-phase">Hedera escrow</p>
          <h2>Hedera bids</h2>
        </div>
        <span className="status-indicator">{bids.length} orders</span>
      </div>
      <table className="table order-book__table">
        <thead>
          <tr>
            <th scope="col">Bidder</th>
            <th scope="col">Amount</th>
            <th scope="col">Position</th>
          </tr>
        </thead>
        <tbody>
          {bids.map((bid) => {
            const you = me && isAddressEqual(bid.bidder, me);
            return (
              <tr key={`${bid.bidder}-${bid.amount}`}>
                <td>
                  <Address value={bid.bidder} chain="hedera" />
                </td>
                <td>
                  <UsdcAmount value={bid.amount} />
                </td>
                <td>{you ? <strong>you</strong> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
