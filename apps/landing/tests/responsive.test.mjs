import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("allows the market terminal to shrink inside mobile grids", async () => {
  const stylesheet = await readFile(
    new URL("../app/terminal.css", import.meta.url),
    "utf8",
  );

  assert.match(stylesheet, /\.terminal\s*\{[^}]*min-width:\s*0;/s);
});

test("loads responsive overrides after base and component styles", async () => {
  const layout = await readFile(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );

  const globalIndex = layout.indexOf('import "./globals.css"');
  const terminalIndex = layout.indexOf('import "./terminal.css"');
  const sectionsIndex = layout.indexOf('import "./sections.css"');
  const responsiveIndex = layout.indexOf('import "./responsive.css"');

  assert.ok(globalIndex < terminalIndex);
  assert.ok(terminalIndex < sectionsIndex);
  assert.ok(sectionsIndex < responsiveIndex);
});
