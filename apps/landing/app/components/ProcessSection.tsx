const stages = [
  {
    number: "01",
    title: "List",
    description:
      "The seller places an ATS hold with ExitAuction as escrow. Bonds stay in the seller wallet and keep the coupon. The reserve is sealed — only its hash is on-chain.",
    network: "Hedera",
  },
  {
    number: "02",
    title: "Bid",
    description:
      "KYC'd wallets approve and placeBid USDC into BidEscrow on Arc. A wallet without KYC for that bond is blocked in the app; executeHoldByPartition would revert anyway.",
    network: "Arc",
  },
  {
    number: "03",
    title: "Award",
    description:
      "A Chainlink CRE handlerInTee — simulated with the CRE CLI, not a hardware TEE — reads the sealed reserve and a confidential compliance screen. The highest eligible bid at or above reserve wins.",
    network: "CRE",
  },
  {
    number: "04",
    title: "Settle",
    description:
      "The operator executeHold on Hedera. The token enforces KYC and whitelist at that instant.",
    network: "Hedera",
  },
  {
    number: "05",
    title: "Pay",
    description:
      "The operator confirmDelivery on Arc. USDC is released to the seller. Losers withdraw.",
    network: "Arc",
  },
];

export function ProcessSection() {
  return (
    <section className="section page-shell" id="how-it-works">
      <div className="section-heading">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-5 max-w-[760px]">
            List. Bid. Award. Settle. Pay. Compliance at the point that matters.
          </h2>
        </div>
        <p className="section-copy max-w-[400px]">
          Remate coordinates the asset leg on Hedera ATS with the cash leg on
          Arc USDC. Settlement is coordinated across two chains, not atomic.
        </p>
      </div>

      <div className="process-grid">
        {stages.map((stage) => (
          <article className="process-card" key={stage.number}>
            <div className="flex items-center justify-between">
              <span className="step-number">{stage.number}</span>
              <span className="network-tag">{stage.network}</span>
            </div>
            <h3>{stage.title}</h3>
            <p>{stage.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
