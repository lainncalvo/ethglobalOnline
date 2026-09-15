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
        <p className="eyebrow hero-eyebrow">ETHOnline 2026 · Testnet</p>
        <h1 className="headline-clip">
          <span className="headline-reveal">
            Secondary markets for tokenized bonds and its KYC&apos;d users.
          </span>
          <span className="headline-reveal headline-kicker">Bid and win.</span>
        </h1>
        <p className="hero-description hero-description-reveal">
          A holder auctions an exit. Only wallets already KYC&apos;d for that
          bond can bid and buy. First-price: the winner pays their own bid.
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
