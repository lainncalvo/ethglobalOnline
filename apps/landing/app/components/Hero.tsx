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
        <p className="eyebrow reveal">Compliant exit markets</p>
        <h1 className="reveal reveal-delay-1">Liquidity for tokenized bonds.</h1>
        <p className="hero-description reveal reveal-delay-2">
          Exit auctions for Hedera ATS bonds. Eligible investors bid USDC on Arc.
          Compliance is enforced again at delivery.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-5 reveal reveal-delay-3">
          <LaunchLink dappUrl={dappUrl} />
          <a className="text-link" href="#how-it-works">
            See how it settles
            <ArrowIcon className="h-4 w-4" />
          </a>
        </div>

        <div className="protocol-line reveal reveal-delay-3" aria-label="Technology partners">
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
