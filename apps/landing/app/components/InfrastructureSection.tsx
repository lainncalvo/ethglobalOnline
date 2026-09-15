import { NetworkIcon } from "./Icons";

const layers = [
  {
    label: "Asset + compliance",
    name: "Hedera ATS",
    detail:
      "Bond hold, whitelist, internal KYC and token-enforced delivery at executeHold.",
  },
  {
    label: "Confidential award",
    name: "Chainlink CRE",
    detail:
      "handlerInTee reads the sealed reserve and a confidential compliance screen so the operator does not pick the winner. Simulated with the CRE CLI — not a hardware TEE.",
  },
  {
    label: "Cash + escrow",
    name: "Arc USDC",
    detail:
      "Native USDC BidEscrow: approve, placeBid, conditional release and withdrawals.",
  },
];

export function InfrastructureSection() {
  return (
    <section className="section page-shell" id="infrastructure">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Infrastructure</p>
          <h2 className="mt-5 max-w-[700px]">Hedera holds the bond. Arc holds the cash.</h2>
        </div>
        <div className="max-w-[440px]">
          <p className="section-copy">
            A coordinated settlement path across two chains, with a Chainlink CRE
            confidential award between them.
          </p>
          <p className="mt-5 text-xs leading-relaxed text-[var(--dim)]">
            Working name. Current prototype runs on testnet. Settlement is
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
