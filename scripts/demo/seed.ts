import { randomBytes } from "node:crypto";
import {
  DEFAULT_PARTITION,
  arcscanTx,
  hashscanTx,
  usdc6,
} from "../../packages/shared/src/chains.ts";
import { computeCommitment } from "../../packages/shared/src/commitment.ts";
import type { Hex } from "viem";
import { loadEnvFiles } from "../ops/load-env.ts";

loadEnvFiles();

const DEFAULTS = {
  deadlineMinutes: 5,
  amount: 10,
  reserve: 1,
  bidA: 1,
  bidB: 2,
};

function flag(name: string, fallback: number): number {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return Number(process.argv[idx + 1]);
  return fallback;
}

function optionalFlag(name: string): number | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return Number(process.argv[idx + 1]);
  return undefined;
}

const deadlineMinutes = flag("deadline-minutes", DEFAULTS.deadlineMinutes);
const amount = flag("amount", DEFAULTS.amount);
const reserveWhole = flag("reserve", DEFAULTS.reserve);
const bidAWhole = flag("bidA", DEFAULTS.bidA);
const bidBWhole = flag("bidB", DEFAULTS.bidB);

if (![amount, reserveWhole, bidAWhole, bidBWhole, deadlineMinutes].every(Number.isFinite)) {
  console.error("invalid numeric flags");
  process.exit(1);
}

function requireKey(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
  return value;
}

const {
  accountFromKey,
} = await import("../../apps/web/lib/clients.ts");
const { exitAuctionAddress } = await import("../../apps/web/lib/hedera.ts");
const { createHold, createAuctionOnHedera } = await import(
  "../../apps/web/lib/seed-writes.ts"
);
const { placeBidOnArc } = await import("../../apps/web/lib/arc.ts");
const { registerAuction } = await import("../../apps/web/lib/handlers/register.ts");
const { loadConfig } = await import("../../apps/web/lib/server-config.ts");

const seller = accountFromKey(requireKey("SELLER_PRIVATE_KEY"));
const buyerA = accountFromKey(requireKey("BUYER_A_PRIVATE_KEY"));
const buyerB = accountFromKey(requireKey("BUYER_B_PRIVATE_KEY"));

const cfg = loadConfig();
if (!cfg.bondToken) {
  console.error("NEXT_PUBLIC_BOND_TOKEN_ADDRESS / bondToken is not set");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const deadline = BigInt(now + deadlineMinutes * 60);
const expiration = deadline + 72n * 3600n + 3600n;
const reserve = usdc6(reserveWhole);
const salt = `0x${randomBytes(32).toString("hex")}` as Hex;
const reserveCommitment = computeCommitment(reserve, salt);

const reusedHoldId = optionalFlag("hold-id");
let holdId: bigint;
if (reusedHoldId !== undefined && Number.isFinite(reusedHoldId)) {
  holdId = BigInt(reusedHoldId);
  console.log(`reusing hold ${holdId}`);
} else {
  const hold = await createHold(seller, {
    token: cfg.bondToken,
    partition: DEFAULT_PARTITION,
    amount: BigInt(amount),
    expiration,
    escrow: exitAuctionAddress(),
  });
  holdId = hold.holdId;
  console.log(`hold ${holdId}`);
  console.log(hashscanTx(hold.txHash));
}

const created = await createAuctionOnHedera(seller, {
  token: cfg.bondToken,
  partition: DEFAULT_PARTITION,
  holdId,
  amount: BigInt(amount),
  deadline,
  reserveCommitment,
});
console.log(`auction ${created.id} ${created.ref}`);
console.log(hashscanTx(created.txHash));

const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
const reserveRes = await fetch(`${apiBase}/api/auctions/${created.ref}/reserve`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ reserve: reserve.toString(), salt }),
});
if (!reserveRes.ok) {
  console.error(`POST /reserve failed: ${reserveRes.status}`);
  process.exit(1);
}

const registered = await registerAuction(created.id.toString());
if ("arcTxHash" in registered && registered.arcTxHash) {
  console.log(arcscanTx(registered.arcTxHash));
}

const bidA = await placeBidOnArc({
  account: buyerA,
  ref: created.ref,
  amount: usdc6(bidAWhole),
});
console.log(arcscanTx(bidA.bidHash));

const bidB = await placeBidOnArc({
  account: buyerB,
  ref: created.ref,
  amount: usdc6(bidBWhole),
});
console.log(arcscanTx(bidB.bidHash));

console.log(created.ref);
console.error(salt);
