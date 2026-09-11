import { CheckShieldIcon, HoldIcon, ReserveIcon } from "./Icons";

const controls = [
  {
    icon: HoldIcon,
    title: "Held, not deposited",
    description:
      "The seller lists through an ATS hold. The bond stays in their wallet until settlement.",
  },
  {
    icon: ReserveIcon,
    title: "Reserve stays sealed",
    description:
      "Only a cryptographic commitment is public while the auction is open.",
  },
  {
    icon: CheckShieldIcon,
    title: "Eligibility is enforced twice",
    description:
      "Whitelist and KYC are checked before a bid and by the ATS token at delivery.",
  },
];

export function TrustSection() {
  return (
    <section className="trust-section">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Designed for controlled assets</p>
            <h2 className="mt-5 max-w-[680px]">Market access without weakening the asset.</h2>
          </div>
          <p className="section-copy max-w-[410px]">
            The venue coordinates discovery and settlement. Hedera ATS remains
            the final authority over who can receive the bond.
          </p>
        </div>

        <div className="control-grid">
          {controls.map(({ icon: Icon, title, description }) => (
            <article className="control-card" key={title}>
              <Icon className="h-7 w-7 text-[var(--green)]" />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
