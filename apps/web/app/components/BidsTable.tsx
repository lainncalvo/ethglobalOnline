"use client";

import { isAddressEqual } from "viem";
import type { BidRow } from "@/lib/types";
import { Address } from "./Address";
import { UsdcAmount } from "./Amount";

export function BidsTable({ bids, me }: { bids: BidRow[]; me?: `0x${string}` }) {
  if (bids.length === 0) {
    return <p className="card muted">No bids yet.</p>;
  }

  return (
    <section className="card overflow-x-auto p-0">
      <table className="table">
        <thead>
          <tr>
            <th>Bidder</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bids.map((bid) => {
            const you = me && isAddressEqual(bid.bidder as `0x${string}`, me);
            return (
              <tr key={`${bid.bidder}-${bid.amount}`}>
                <td>
                  <Address value={bid.bidder} chain="arc" />
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
