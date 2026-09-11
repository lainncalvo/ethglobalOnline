// server-only — L5 backend. Do not import from client components.
import { getAddress } from "viem";
import { ARC_CHAIN_ID, HEDERA_CHAIN_ID } from "../../../../packages/shared/src/chains";
import { getOperatorUsdc } from "../arc";
import { arcPublic, hederaPublic, operatorAccount } from "../clients";
import { ApiError, ErrorCode } from "../errors";
import { getOperatorHbar } from "../hedera";
import { loadConfig } from "../server-config";

export async function health() {
  const cfg = loadConfig();
  let operator = "";
  try {
    operator = getAddress(operatorAccount().address);
  } catch {
    const wallets = (
      cfg.addressesFile as { demoWallets?: { operator?: string } }
    ).demoWallets;
    operator = wallets?.operator ?? "";
  }
  try {
    const [hederaBlock, arcBlock, hbar, usdc] = await Promise.all([
      hederaPublic().getBlockNumber(),
      arcPublic().getBlockNumber(),
      getOperatorHbar(),
      getOperatorUsdc(),
    ]);
    return {
      hedera: {
        chainId: HEDERA_CHAIN_ID,
        block: hederaBlock.toString(),
        operator,
        hbar: hbar.toString(),
      },
      arc: {
        chainId: ARC_CHAIN_ID,
        block: arcBlock.toString(),
        operator,
        usdc: usdc.toString(),
      },
      addresses: cfg.addressesFile,
      awardMode: cfg.awardMode,
    };
  } catch {
    throw new ApiError(
      503,
      ErrorCode.CHAIN_UNREACHABLE,
      "failed to read a chain head or operator balance",
    );
  }
}
