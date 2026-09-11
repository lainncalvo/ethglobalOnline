const stages = [
  {
    number: "01",
    title: "List",
    description: "Place an ATS hold on the bond and commit to a sealed reserve.",
    network: "Hedera",
  },
  {
    number: "02",
    title: "Bid",
    description: "Eligible investors place escrowed USDC bids after a compliance preflight.",
    network: "Arc",
  },
  {
    number: "03",
    title: "Award",
    description: "A confidential workflow selects the highest compliant bid above reserve.",
    network: "CRE",
  },
  {
    number: "04",
    title: "Deliver",
    description: "ATS checks the winner again as the bond hold is executed.",
    network: "Hedera",
  },
  {
    number: "05",
    title: "Pay",
    description: "Delivery confirmation releases USDC to the seller; losers withdraw.",
    network: "Arc",
  },
];

export function ProcessSection() {
  return (
    <section className="section page-shell" id="how-it-works">
      <div className="section-heading">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-5 max-w-[720px]">
            One auction. Two networks. Compliance at the point that matters.
          </h2>
        </div>
        <p className="section-copy max-w-[400px]">
          Remate coordinates the asset leg on Hedera with the cash leg on Arc,
          while keeping the token&apos;s own transfer rules in control.
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
