import assert from "node:assert/strict";
import test from "node:test";

import { resolveDappUrl } from "../lib/dapp-url.mjs";

test("uses the local dapp when no deployment URL is configured", () => {
  assert.equal(resolveDappUrl(), "http://localhost:3000");
});

test("removes trailing slashes from the configured dapp URL", () => {
  assert.equal(
    resolveDappUrl("https://app.remate.example///"),
    "https://app.remate.example",
  );
});

test("rejects non-http protocols", () => {
  assert.throws(
    () => resolveDappUrl("javascript:alert(1)"),
    /must use http or https/i,
  );
});
