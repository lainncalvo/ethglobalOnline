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
    <section className="card">
      <h2 className="mb-2">{title}</h2>
      <p className="mb-3">{summary}</p>
      {details && details.length > 0 ? (
        <dl className="mb-3 grid gap-2">
          {details.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-x-3 gap-y-1">
              <dt className="muted">{row.label}</dt>
              <dd className="font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {links.length > 0 ? (
        <ul className="grid gap-2">
          {links.map((link) => (
            <li key={`${link.chain}-${link.label}-${link.hash}`} className="flex flex-wrap items-baseline gap-x-3">
              <span className="muted">{link.label}</span>
              <ExplorerLink chain={link.chain} hash={link.hash} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
