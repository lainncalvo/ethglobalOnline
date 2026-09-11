import { arcscanTx } from "../../packages/shared/src/chains.ts";
import { loadEnvFiles } from "./load-env.ts";

loadEnvFiles();

const id = process.argv[2];
if (!id) {
  console.error("usage: bun scripts/ops/register.ts <hederaAuctionId>");
  process.exit(1);
}

const { registerAuction } = await import("../../apps/web/lib/handlers/register.ts");
const result = await registerAuction(id);
console.log(result.ref);
if ("alreadyRegistered" in result && result.alreadyRegistered) {
  console.log("already registered");
} else if ("arcTxHash" in result) {
  console.log(arcscanTx(result.arcTxHash));
}
