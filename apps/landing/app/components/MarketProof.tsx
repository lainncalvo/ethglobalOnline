export function MarketProof() {
  return (
    <section className="proof-section border-y border-[var(--line)]">
      <div className="page-shell proof-grid">
        <div className="proof-stat">KYC</div>
        <div className="max-w-[520px]">
          <p className="data-label mb-4">For that bond</p>
          <h2>Only wallets already KYC&apos;d for that bond can bid and buy.</h2>
          <p className="section-copy mt-5">
            A holder of a compliant tokenized bond opens a first-price exit
            auction. Eligible investors bid USDC. The winner pays their own bid.
            The seller is paid after delivery. Losers withdraw.
          </p>
        </div>
      </div>
    </section>
  );
}
