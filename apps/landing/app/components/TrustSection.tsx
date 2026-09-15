import { CheckShieldIcon, HoldIcon, ReserveIcon } from "./Icons";

const controls = [
  {
    icon: HoldIcon,
    title: "Held, not deposited",
    description:
      "The seller lists through an ATS hold. The bonds stay in their wallet and keep earning the coupon until settlement.",
  },
  {
    icon: ReserveIcon,
    title: "Reserve stays sealed",
    description:
      "Only a cryptographic commitment is public while the auction is open. The plaintext reserve is not on-chain.",
  },
  {
    icon: CheckShieldIcon,
    title: "KYC for that bond, twice",
    description:
      "Whitelist and KYC are checked before a bid and by the ATS token at executeHold. A non-compliant wallet cannot receive the bond.",
  },
];

export function TrustSection() {
  return (
    <section className="trust-section">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Designed for controlled assets</p>
            <h2 className="mt-5 max-w-[680px]">
              The token keeps the last word on who can buy.
            </h2>
          </div>
          <p className="section-copy max-w-[410px]">
            Remate coordinates discovery and settlement. Hedera ATS remains the
            authority over who can receive the bond.
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
