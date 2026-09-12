import type { Hex } from "viem";
import type { TxStep } from "@/lib/types";
import { ExplorerLink } from "./ExplorerLink";
import { TxStepper } from "./TxStepper";

export function ListingProgress({ steps }: { steps: TxStep[] }) {
  return (
    <section className="card listing-progress" aria-label="Transaction progress">
      <div className="section-heading">
        <div>
          <p className="market-phase">Execution ledger</p>
          <h2>Transaction progress</h2>
        </div>
      </div>
      <TxStepper steps={steps} />
    </section>
  );
}

export function ListingComplete({
  result,
}: {
  result: {
    ref: Hex;
    holdHash?: Hex;
    auctionHash?: Hex;
    arcTxHash?: string;
  };
}) {
  return (
    <div className="banner-ok listing-complete" role="status">
      <div>
        <p className="market-phase">Workflow complete</p>
        <h2>Auction listed.</h2>
      </div>
      <p>Hold · <ExplorerLink chain="hedera" hash={result.holdHash} /></p>
      <p>Auction · <ExplorerLink chain="hedera" hash={result.auctionHash} /></p>
      {result.arcTxHash ? (
        <p>Arc register · <ExplorerLink chain="arc" hash={result.arcTxHash} /></p>
      ) : null}
      <a href={`/auction/${result.ref}`} className="btn btn-primary listing-complete__action">
        Go to auction
      </a>
    </div>
  );
}
