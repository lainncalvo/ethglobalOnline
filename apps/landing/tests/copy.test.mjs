import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname } from "node:path";
import test from "node:test";

const oneLiner =
  "Secondary markets for tokenized bonds and its KYC'd users. Bid and win.";

async function collectAppSource() {
  const files = [];
  const root = new URL("../app/", import.meta.url);

  async function walk(dirUrl) {
    for (const entry of await readdir(dirUrl, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dirUrl);
      if (entry.isDirectory()) {
        await walk(child);
        continue;
      }
      if (![".tsx", ".ts", ".css"].includes(extname(entry.name))) continue;
      files.push(await readFile(child, "utf8"));
    }
  }

  await walk(root);
  return files.join("\n");
}

test("locks the ETHGlobal one-liner in metadata and the hero split", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const hero = await readFile(
    new URL("../app/components/Hero.tsx", import.meta.url),
    "utf8",
  );

  assert.match(layout, /Secondary markets for tokenized bonds and its KYC'd users\. Bid and win\./);
  assert.match(hero, /Secondary markets for tokenized bonds and its KYC&apos;d users\./);
  assert.match(hero, />Bid and win\.</);
  assert.doesNotMatch(hero, /a tokenized bonds/);
  assert.doesNotMatch(hero, /Bid and buy/);
  assert.equal(oneLiner.length <= 100, true);
});

test("does not ship forbidden landing claims", async () => {
  const source = await collectAppSource();

  for (const banned of [
    "Asseto",
    "ECB",
    "183",
    "89%",
    "issuance is solved",
    "Issuance works",
    "atomic DvP",
    "1inch",
    "BUIDL",
    "USYC",
    "Arc mainnet",
    "OPERATOR_UI_TOKEN",
  ]) {
    assert.equal(source.includes(banned), false, `landing must not include “${banned}”`);
  }
});
