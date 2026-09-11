import { FinalCta } from "./components/FinalCta";
import { Hero } from "./components/Hero";
import { InfrastructureSection } from "./components/InfrastructureSection";
import { MarketProof } from "./components/MarketProof";
import { ProcessSection } from "./components/ProcessSection";
import { SiteHeader } from "./components/SiteHeader";
import { TrustSection } from "./components/TrustSection";
import { resolveDappUrl } from "../lib/dapp-url.mjs";

export default function Home() {
  const dappUrl = resolveDappUrl(process.env.NEXT_PUBLIC_DAPP_URL);

  return (
    <>
      <SiteHeader dappUrl={dappUrl} />
      <main>
        <Hero dappUrl={dappUrl} />
        <MarketProof />
        <ProcessSection />
        <TrustSection />
        <InfrastructureSection />
        <FinalCta dappUrl={dappUrl} />
      </main>
    </>
  );
}
