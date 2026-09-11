import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("provides a visible outline for every focused link", async () => {
  const stylesheet = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(stylesheet, /a:focus,\s*a:focus-visible\s*\{/);
});
