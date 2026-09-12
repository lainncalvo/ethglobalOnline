import { ArrowIcon } from "./Icons";
import { LaunchLink } from "./LaunchLink";
import { MarketTerminal } from "./MarketTerminal";

interface HeroProps {
  dappUrl: string;
}

export function Hero({ dappUrl }: HeroProps) {
  return (
    <section className="hero page-shell" id="product">
      <div className="hero-copy">
        <p className="eyebrow hero-eyebrow">Compliant exit markets</p>
        <h1 className="headline-clip">
          <span className="headline-reveal">Liquidity for tokenized bonds.</span>
        </h1>
        <p className="hero-description hero-description-reveal">
          Exit auctions for Hedera ATS bonds. Eligible investors bid USDC on Arc.
          Compliance is enforced again at delivery.
        </p>

        <div className="hero-actions mt-8 flex flex-wrap items-center gap-5">
          <LaunchLink dappUrl={dappUrl} />
          <a className="text-link" href="#how-it-works">
            See how it settles
            <ArrowIcon className="h-4 w-4" />
          </a>
        </div>

        <div className="protocol-line" aria-label="Technology partners">
          <span>Hedera ATS</span>
          <span aria-hidden="true">/</span>
          <span>Arc USDC</span>
          <span aria-hidden="true">/</span>
          <span>Chainlink CRE</span>
        </div>
      </div>

      <MarketTerminal />
    </section>
  );
}
