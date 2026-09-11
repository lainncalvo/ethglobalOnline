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
    return <p className="card muted">No operator calls yet.</p>;
  }

  return (
    <section className="card">
      <h2 className="mb-3">Log</h2>
      <ol className="grid gap-3">
        {entries.map((entry, index) => {
          const hashes = collectHashes(entry.body);
          return (
            <li key={`${entry.at}-${index}`} className="border border-[#ccc] p-2">
              <p className="font-semibold">
                {entry.action} <span className="muted text-sm">{entry.at}</span>
              </p>
              <pre className="hash mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(entry.body, null, 2)}
              </pre>
              {hashes.length > 0 ? (
                <ul className="mt-2">
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
    </section>
  );
}
