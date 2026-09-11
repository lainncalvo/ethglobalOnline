import { arcscanTx } from "../../packages/shared/src/chains.ts";
import { loadEnvFiles } from "./load-env.ts";

loadEnvFiles();

const ref = process.argv[2];
const forceLocal = process.argv.includes("--local");
if (!ref) {
  console.error("usage: bun scripts/ops/close.ts <ref> [--local]");
  process.exit(1);
}

const { closeAuction } = await import("../../apps/web/lib/handlers/close.ts");
const result = await closeAuction(ref, { forceLocal });
if (result.mode === "cre") {
  console.log("cre trigger accepted");
} else {
  console.log(result.arcTxHash);
  console.log(arcscanTx(result.arcTxHash));
  console.log(`outcome=${result.award.outcome} winner=${result.award.winner}`);
}
