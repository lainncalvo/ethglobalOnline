import { ArrowIcon } from "./Icons";

export function MarketProof() {
  return (
    <section className="proof-section border-y border-[var(--line)]">
      <div className="page-shell proof-grid">
        <div className="proof-stat">
          <span className="text-[var(--green)]">20</span>
          <span className="text-[var(--dim)]"> / 183</span>
        </div>
        <div className="max-w-[470px]">
          <p className="data-label mb-4">The liquidity gap</p>
          <h2>Issuance works. Exit remains fragmented.</h2>
          <p className="section-copy mt-5">
            The ECB identified 183 tokenized bonds, but could assemble a
            secondary-market sample for only 20. Tokenization needs a credible
            path out, not just a path in.
          </p>
          <a
            className="source-link"
            href="https://www.ecb.europa.eu/press/financial-stability-publications/macroprudential-bulletin/html/ecb.mpbu202604_03.en.html"
            rel="noreferrer"
            target="_blank"
          >
            ECB Macroprudential Bulletin
            <ArrowIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
