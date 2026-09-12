import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesDirectory = resolve(import.meta.dir, "../app/styles");

function readStyle(fileName: string): string {
  return readFileSync(resolve(stylesDirectory, fileName), "utf8");
}

describe("receipt and operator visual CSS contracts", () => {
  test("prints complete external receipt destinations", () => {
    const receipts = readStyle("receipts.css");

    expect(receipts).toMatch(
      /@media print[\s\S]*:where\(\.action-receipt,\s*\.outcome-card\) a\[href\^="http"\]::after/,
    );
    expect(receipts).toContain('content: " (" attr(href) ")"');
  });

  test("uses readable tokens for all small receipt and operator text", () => {
    const smallTextStyles = [
      "receipts.css",
      "receipts-responsive.css",
      "operator.css",
      "operator-log.css",
      "operator-responsive.css",
    ].map(readStyle).join("\n");

    expect(smallTextStyles).not.toContain("var(--color-dim)");
    expect(smallTextStyles).toContain("var(--color-muted)");
  });

  test("keeps operator action controls at least 44px tall", () => {
    const operator = readStyle("operator.css");

    expect(operator).toMatch(
      /\.operator-actions__button\s*\{[^}]*min-height:\s*44px/s,
    );
    expect(operator).toMatch(
      /\.operator-actions__inputs input\s*\{[^}]*min-height:\s*44px/s,
    );
  });

  test("groups action buttons safely in the 390px card reflow", () => {
    const responsive = readStyle("operator-responsive.css");

    expect(responsive).toMatch(
      /@media \(max-width: 390px\)[\s\S]*\.operator-actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*8px/s,
    );
    expect(responsive).toMatch(
      /@media \(max-width: 390px\)[\s\S]*\.operator-actions__button\s*\{[^}]*width:\s*100%/s,
    );
  });

  test("owns the operator eyebrow selector in operator styles", () => {
    const receipts = readStyle("receipts.css");
    const operator = readStyle("operator.css");

    expect(receipts).not.toContain(".operator-eyebrow");
    expect(operator).toContain(".operator-eyebrow");
  });
});
