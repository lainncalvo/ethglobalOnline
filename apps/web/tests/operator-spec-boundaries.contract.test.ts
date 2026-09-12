import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appDirectory = resolve(import.meta.dir, "../app");

function readAppFile(relativePath: string): string {
  return readFileSync(resolve(appDirectory, relativePath), "utf8");
}

describe("operator redesign spec boundaries", () => {
  test("keeps the original query result branches exactly", () => {
    const source = readAppFile("components/OperatorConsole.tsx");

    expect(source).toContain("health.data ?");
    expect(source).toContain("Loading health…");
    expect(source).not.toContain("health.error");
    expect(source).not.toContain("auctions.isPending");
    expect(source).not.toContain("auctions.error");
    expect(source).not.toContain("auctions.data?.mocked");
    expect(source).toContain("(auctions.data?.auctions ?? []).length === 0");
    expect(source).toContain("(auctions.data?.auctions ?? []).map((auction)");
  });

  test("does not restyle transaction components owned by prior tasks", () => {
    const txError = readAppFile("components/TxError.tsx");
    const txStepper = readAppFile("components/TxStepper.tsx");
    const sellStyles = readAppFile("styles/sell.css");

    expect(txError).toContain(
      'const cls = tone === "ok" ? "banner-ok" : tone === "bad" ? "banner-bad" : "muted";',
    );
    expect(txError).not.toContain('"banner-neutral"');
    expect(txStepper).toContain('className="text-[var(--bad)]"');
    expect(txStepper).toContain('className="text-[var(--ok)]"');
    expect(sellStyles).not.toContain(".tx-ledger__error");
    expect(sellStyles).not.toContain(".tx-ledger__done");
  });
});
