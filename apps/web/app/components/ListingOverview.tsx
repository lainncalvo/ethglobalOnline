export function ListingOverview({
  amount,
  reserve,
  deadline,
  symbol,
}: {
  amount: string;
  reserve: string;
  deadline: string;
  symbol: string;
}) {
  return (
    <aside className="card listing-overview" aria-label="Listing overview">
      <div>
        <p className="market-phase">Listing overview</p>
        <h2>Execution route</h2>
        <p className="muted">One signed workflow across Hedera and Arc.</p>
      </div>
      <ol className="listing-overview__route">
        <li><span>01</span>Create ATS hold</li>
        <li><span>02</span>Register auction</li>
        <li><span>03</span>Mirror on Arc</li>
        <li><span>04</span>Store sealed reserve</li>
      </ol>
      <dl className="listing-overview__terms">
        <div>
          <dt>Lot</dt>
          <dd className="data-value">{amount} {symbol || "bonds"}</dd>
        </div>
        <div>
          <dt>Reserve</dt>
          <dd className="data-value">{reserve} USDC</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd className="data-value">{deadline.replace("T", " ")}</dd>
        </div>
      </dl>
    </aside>
  );
}
