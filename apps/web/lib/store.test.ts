import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { appendTimeline, nowIso, publicRecord, withStore } from "./store";

describe("json store", () => {
  test("atomic write and never exposes reserve on publicRecord", async () => {
    const dir = await mkdtemp(join(tmpdir(), "remate-l5-"));
    process.env.DATA_DIR = dir;
    const ref =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    await withStore((db) => {
      appendTimeline(
        db,
        ref,
        { step: "listed", chain: "hedera", txHash: "0x1", at: nowIso() },
        "1",
      );
      db.auctions[ref]!.reserve = "14000000000";
      db.auctions[ref]!.salt =
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    });
    const raw = await readFile(join(dir, "db.json"), "utf8");
    expect(raw).toContain("14000000000");
    const published = await withStore((db) => publicRecord(db.auctions[ref]));
    expect(published?.hederaAuctionId).toBe("1");
    expect(published && "reserve" in published).toBe(false);
    expect(published && "salt" in published).toBe(false);
  });
});
