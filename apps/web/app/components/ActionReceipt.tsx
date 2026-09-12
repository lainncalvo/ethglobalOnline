import { ExplorerLink } from "./ExplorerLink";

export type ReceiptLink = {
  label: string;
  chain: "hedera" | "arc";
  hash: string;
};

export function ActionReceipt({
  title,
  summary,
  details,
  links,
}: {
  title: string;
  summary: string;
  details?: { label: string; value: string }[];
  links: ReceiptLink[];
}) {
  return (
    <section
      className="card action-receipt"
      aria-label={`${title} transaction receipt`}
      aria-live="polite"
    >
      <header className="action-receipt__header">
        <p className="action-receipt__eyebrow">Transaction receipt</p>
        <h2>{title}</h2>
        <p className="action-receipt__summary">{summary}</p>
      </header>
      {details && details.length > 0 ? (
        <dl className="action-receipt__details">
          {details.map((row) => (
            <div key={row.label} className="action-receipt__detail">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {links.length > 0 ? (
        <ul className="action-receipt__rail" aria-label="Transaction evidence">
          {links.map((link, index) => (
            <li
              key={`${link.chain}-${link.label}-${link.hash}`}
              className="action-receipt__step"
              data-chain={link.chain}
            >
              <span className="action-receipt__step-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="action-receipt__link-label">{link.label}</span>
              <ExplorerLink chain={link.chain} hash={link.hash} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
