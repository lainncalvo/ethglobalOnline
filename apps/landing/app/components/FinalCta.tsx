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
          <p className="eyebrow">Test the exit path</p>
          <h2>Tokenized bonds deserve a market after issuance.</h2>
          <p>
            Explore the testnet auction flow from compliant listing to
            delivery-conditioned payment.
          </p>
          <div className="mt-9">
            <LaunchLink dappUrl={dappUrl} label="Open Testnet Market" />
          </div>
        </div>
      </section>

      <footer className="page-shell footer">
        <BrandMark />
        <p>Exit auctions for tokenized bonds.</p>
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
