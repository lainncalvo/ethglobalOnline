// server-only — L5 backend. Do not import from client components.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { TimelineEntry } from "./types";

export type AuctionRecord = {
  hederaAuctionId: string;
  reserve?: string;
  salt?: string;
  timeline: TimelineEntry[];
};

export type Db = {
  auctions: Record<string, AuctionRecord>;
};

function defaultDataDir(): string {
  const env = process.env.DATA_DIR;
  if (env) return resolve(env);
  if (process.cwd().replace(/\\/g, "/").endsWith("apps/web")) {
    return resolve(process.cwd(), "data");
  }
  return resolve(process.cwd(), "apps/web/data");
}

function dbPath(): string {
  return join(defaultDataDir(), "db.json");
}

const emptyDb = (): Db => ({ auctions: {} });

let chain: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<Db> {
  try {
    const raw = await readFile(dbPath(), "utf8");
    const parsed = JSON.parse(raw) as Db;
    if (!parsed || typeof parsed !== "object" || !parsed.auctions) {
      return emptyDb();
    }
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyDb();
    throw err;
  }
}

async function writeDb(db: Db): Promise<void> {
  const dest = dbPath();
  await mkdir(dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  const json = `${JSON.stringify(db, null, 2)}\n`;
  await writeFile(tmp, json, "utf8");
  await rename(tmp, dest);
}

/** Single in-process mutex around read-modify-write. */
export function withStore<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function readStore<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = await readDb();
    return fn(db);
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function publicRecord(
  record: AuctionRecord | undefined,
): Omit<AuctionRecord, "reserve" | "salt"> | undefined {
  if (!record) return undefined;
  return {
    hederaAuctionId: record.hederaAuctionId,
    timeline: record.timeline,
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function appendTimeline(
  db: Db,
  ref: string,
  entry: TimelineEntry,
  hederaAuctionId?: string,
): void {
  const current = db.auctions[ref] ?? {
    hederaAuctionId: hederaAuctionId ?? "",
    timeline: [],
  };
  if (hederaAuctionId) current.hederaAuctionId = hederaAuctionId;
  current.timeline.push(entry);
  db.auctions[ref] = current;
}
