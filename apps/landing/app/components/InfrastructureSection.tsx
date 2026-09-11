import { NetworkIcon } from "./Icons";

const layers = [
  {
    label: "Asset + compliance",
    name: "Hedera ATS",
    detail: "Bond hold, whitelist, KYC and delivery",
  },
  {
    label: "Confidential award",
    name: "Chainlink CRE",
    detail: "Sealed reserve and compliant winner selection",
  },
  {
    label: "Cash + escrow",
    name: "Arc USDC",
    detail: "Bids, conditional release and withdrawals",
  },
];

export function InfrastructureSection() {
  return (
    <section className="section page-shell" id="infrastructure">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Infrastructure</p>
          <h2 className="mt-5 max-w-[700px]">The asset rules stay with the asset.</h2>
        </div>
        <div className="max-w-[420px]">
          <p className="section-copy">
            A coordinated settlement path across Hedera and Arc, with a
            confidential award between them.
          </p>
          <p className="mt-5 text-xs leading-relaxed text-[var(--dim)]">
            Current prototype runs on testnet. Cross-chain settlement is
            coordinated, not atomic.
          </p>
        </div>
      </div>

      <div className="infra-grid">
        {layers.map((layer, index) => (
          <article className="infra-card" key={layer.name}>
            <div className="flex items-start justify-between gap-4">
              <span className="infra-index">0{index + 1}</span>
              <NetworkIcon className="h-6 w-6 text-[var(--green)]" />
            </div>
            <p className="data-label mt-16">{layer.label}</p>
            <h3>{layer.name}</h3>
            <p>{layer.detail}</p>
          </article>
        ))}
      </div>

      <div className="explorer-row">
        <span>Verified testnet contracts</span>
        <a
          href="https://hashscan.io/testnet/contract/0x74F7E850AC2511b837480983f6ED9308b3842377"
          rel="noreferrer"
          target="_blank"
        >
          HashScan ↗
        </a>
        <a
          href="https://testnet.arcscan.app/address/0x74F7E850AC2511b837480983f6ED9308b3842377"
          rel="noreferrer"
          target="_blank"
        >
          ArcScan ↗
        </a>
      </div>
    </section>
  );
}
