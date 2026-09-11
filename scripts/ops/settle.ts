import { arcscanTx, hashscanTx } from "../../packages/shared/src/chains.ts";
import { loadEnvFiles } from "./load-env.ts";

loadEnvFiles();

const ref = process.argv[2];
if (!ref) {
  console.error("usage: bun scripts/ops/settle.ts <ref>");
  process.exit(1);
}

const { settleAuction } = await import("../../apps/web/lib/handlers/settle.ts");
const result = await settleAuction(ref);
if ("voided" in result && result.voided) {
  console.error(`voided reason=${result.reason}`);
  if (result.hederaTxHash) console.error(hashscanTx(result.hederaTxHash));
  process.exit(1);
}
if ("hederaTxHash" in result && result.hederaTxHash) {
  console.log(result.hederaTxHash);
  console.log(hashscanTx(result.hederaTxHash));
}
if ("arcTxHash" in result && result.arcTxHash) {
  console.log(result.arcTxHash);
  console.log(arcscanTx(result.arcTxHash));
}
