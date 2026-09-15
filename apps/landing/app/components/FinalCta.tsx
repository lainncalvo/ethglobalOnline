import { BrandMark } from "./BrandMark";
import { LaunchLink } from "./LaunchLink";

interface FinalCtaProps {
  dappUrl: string;
}

export function FinalCta({ dappUrl }: FinalCtaProps) {
  return (
    <>
      <section className="cta-section">
        <div className="page-shell cta-inner">
          <p className="eyebrow">Testnet market</p>
          <h2>Bid and win.</h2>
          <p>
            Explore the testnet auction from a KYC&apos;d listing to
            delivery-conditioned payment. Working name.
          </p>
          <div className="mt-9">
            <LaunchLink dappUrl={dappUrl} label="Open Testnet Market" />
          </div>
        </div>
      </section>

      <footer className="page-shell footer">
        <div className="footer-brand">
          <BrandMark />
          <p className="footer-team">
            ETHOnline 2026. Testnet. Team: Laín Calvo · Axel Geslin (Argentina).
            Working name.
          </p>
        </div>

        <div className="footer-limitations">
          <p>
            Settlement is coordinated across two chains, not atomic. The operator
            can stall, void or cancel. The operator cannot redirect USDC or
            deliver to a non-compliant wallet.
          </p>
          <p>
            CRE award on-chain (Awarded source=CRE) is pending evidence; the demo
            may use awardByOperator (source=Operator).
          </p>
        </div>

        <div className="footer-links">
          <a
            href="https://github.com/lainncalvo/ethglobalOnline"
            rel="noreferrer"
            target="_blank"
          >
            GitHub ↗
          </a>
          <a href="#product">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
