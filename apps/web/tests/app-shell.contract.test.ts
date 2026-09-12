import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appDirectory = resolve(import.meta.dir, "../app");

function readAppFile(relativePath: string): string {
  return readFileSync(resolve(appDirectory, relativePath), "utf8");
}

describe("exchange app design foundations", () => {
  test("defines the approved dark palette and typography tokens", () => {
    const tokens = readAppFile("styles/tokens.css");

    expect(tokens).toContain("--color-canvas: #080b09");
    expect(tokens).toContain("--color-ink: #f2efe4");
    expect(tokens).toContain("--color-accent: #8ce06d");
    expect(tokens).toContain("--color-panel: #0c100d");
    expect(tokens).toContain("--color-panel-raised: #111612");
    expect(tokens).toContain("--font-sans: var(--font-instrument-sans)");
    expect(tokens).toContain("--font-mono: var(--font-ibm-plex-mono)");
  });

  test("loads focused styles in dependency order", () => {
    const globals = readAppFile("globals.css");
    const orderedImports = [
      '@import "./styles/tokens.css";',
      '@import "./styles/base.css";',
      '@import "./styles/components.css";',
      '@import "./styles/shell.css";',
      '@import "./styles/responsive.css";',
    ];

    const importPositions = orderedImports.map((statement) => globals.indexOf(statement));
    expect(importPositions.every((position) => position >= 0)).toBe(true);
    expect(importPositions).toEqual([...importPositions].sort((a, b) => a - b));
  });

  test("uses accessible focus and motion preferences", () => {
    const base = readAppFile("styles/base.css");
    const responsive = readAppFile("styles/responsive.css");

    expect(base).toContain(":focus-visible");
    expect(base).toContain("outline: 2px solid var(--focus)");
    expect(responsive).toContain("@media (prefers-reduced-motion: reduce)");
    expect(responsive).toContain("animation-duration: 0.01ms");
  });

  test("uses landing fonts and a mobile-safe workspace shell", () => {
    const layout = readAppFile("layout.tsx");
    const header = readAppFile("components/Header.tsx");
    const responsive = readAppFile("styles/responsive.css");

    expect(layout).toContain("IBM_Plex_Mono, Instrument_Sans");
    expect(layout).toContain("--font-instrument-sans");
    expect(layout).toContain("--font-ibm-plex-mono");
    expect(header).toContain('aria-current={active ? "page" : undefined}');
    expect(header).toContain("<BrandMark");
    expect(responsive).toContain("@media (max-width: 640px)");
    expect(responsive).toContain(".workspace-header__inner");
    expect(responsive).toContain(".workspace-nav");
  });
});
