"use client";

import { isAddressEqual } from "viem";
import type { BidRow } from "@/lib/types";
import { Address } from "./Address";
import { UsdcAmount } from "./Amount";

export function BidsTable({ bids, me }: { bids: BidRow[]; me?: `0x${string}` }) {
  if (bids.length === 0) {
    return (
      <section className="card order-book order-book--empty">
        <div className="section-heading">
          <div>
            <p className="market-phase">Arc escrow</p>
            <h2>Bids</h2>
          </div>
          <span className="status-indicator">0 orders</span>
        </div>
        <p className="muted">No bids yet.</p>
      </section>
    );
  }

  return (
    <section className="card order-book">
      <div className="section-heading">
        <div>
          <p className="market-phase">Arc escrow</p>
          <h2>Bids</h2>
        </div>
        <span className="status-indicator">{bids.length} orders</span>
      </div>
      <div
        className="order-book__scroll"
        role="region"
        aria-label="Auction bids"
        tabIndex={0}
      >
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
      </div>
    </section>
  );
}
