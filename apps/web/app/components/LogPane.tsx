import { isTxHash } from "@/lib/format";
import { explorerUrl } from "./ExplorerLink";

export type LogEntry = {
  at: string;
  action: string;
  body: unknown;
};

function collectHashes(value: unknown, path = ""): { label: string; hash: string; chain: "hedera" | "arc" }[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const next = path ? `${path}.${key}` : key;
    if (isTxHash(child)) {
      const lower = key.toLowerCase();
      const chain = lower.includes("hedera") || lower.includes("hashscan") ? "hedera" : "arc";
      return [{ label: next, hash: child, chain }];
    }
    if (child && typeof child === "object") return collectHashes(child, next);
    return [];
  });
}

export function LogPane({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return (
      <section className="card operator-log operator-log--empty" aria-labelledby="operator-log-title">
        <header className="operator-section-heading">
          <div>
            <p className="operator-eyebrow">Session record</p>
            <h2 id="operator-log-title">Audit log</h2>
          </div>
          <span className="operator-log__count">0 entries</span>
        </header>
        <p className="muted operator-log__empty" role="status">
          No operator calls yet.
        </p>
      </section>
    );
  }

  return (
    <section className="card operator-log" aria-labelledby="operator-log-title">
      <header className="operator-section-heading">
        <div>
          <p className="operator-eyebrow">Session record</p>
          <h2 id="operator-log-title">Audit log</h2>
        </div>
        <span className="operator-log__count">{entries.length} entries</span>
      </header>
      <div className="operator-log__scroll" aria-label="Operator audit log" role="region" tabIndex={0}>
        <ol className="operator-log__entries">
          {entries.map((entry, index) => {
            const hashes = collectHashes(entry.body);
            return (
              <li key={`${entry.at}-${index}`} className="operator-log__entry">
                <header className="operator-log__entry-header">
                  <strong>{entry.action}</strong>
                  <time dateTime={entry.at}>{entry.at}</time>
                </header>
                <pre className="hash operator-log__payload">
                  {JSON.stringify(entry.body, null, 2)}
                </pre>
                {hashes.length > 0 ? (
                  <ul className="operator-log__links" aria-label="Explorer links">
                    {hashes.map((item) => (
                      <li key={item.hash}>
                        <a href={explorerUrl(item.chain, item.hash)} target="_blank" rel="noreferrer">
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
