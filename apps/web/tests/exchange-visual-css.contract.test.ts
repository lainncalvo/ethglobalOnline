import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesDirectory = resolve(import.meta.dir, "../app/styles");

function readStyle(fileName: string): string {
  return readFileSync(resolve(stylesDirectory, fileName), "utf8");
}

describe("exchange accessibility visual CSS contracts", () => {
  test("keeps the open auction action at least 44px tall at 390px", () => {
    const auction = readStyle("auction.css");
    const responsive = readStyle("responsive.css");

    expect(auction).toMatch(
      /\.market-auction__actions \.btn\s*\{[^}]*min-height:\s*44px/s,
    );
    expect(responsive).toMatch(
      /@media \(max-width: 390px\)[\s\S]*\.market-auction__actions \.btn\s*\{[^}]*width:\s*100%/s,
    );
  });

  test("keeps desktop sticky panels below the 64px header", () => {
    const auctionDetail = readStyle("auction-detail.css");
    const sell = readStyle("sell.css");

    expect(auctionDetail).toMatch(
      /\.auction-workspace__ticket-stack\s*\{[^}]*position:\s*sticky;[^}]*top:\s*84px/s,
    );
    expect(sell).toMatch(
      /\.listing-overview\s*\{[^}]*position:\s*sticky;[^}]*top:\s*84px/s,
    );
  });

  test("uses readable muted text for the copy affordance", () => {
    const data = readStyle("data.css");
    const copyRule =
      data.match(/\.data-address__copy\s*\{[^}]*\}/s)?.[0] ?? "";

    expect(copyRule).toContain("color: var(--color-muted)");
    expect(copyRule).not.toContain("var(--color-dim)");
  });
});
