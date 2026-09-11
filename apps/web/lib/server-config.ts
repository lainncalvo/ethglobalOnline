// server-only — L5 backend. Do not import from client components.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAddress, isAddress, type Address } from "viem";
import {
  ARC_CHAIN_ID,
  HEDERA_CHAIN_ID,
  USDC_ADDRESS,
} from "../../../packages/shared/src/chains";
import { ApiError, ErrorCode } from "./errors";

type AddressesFile = {
  "hedera-testnet": {
    chainId: number;
    exitAuction: string;
    bondToken: string;
    atsFactory: string;
    atsResolver: string;
  };
  "arc-testnet": {
    chainId: number;
    bidEscrow: string;
    usdc: string;
    forwarder: string;
  };
  demoWallets: Record<string, string>;
};

function optionalAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || !isAddress(trimmed)) return undefined;
  return getAddress(trimmed);
}

function loadAddressesFile(): AddressesFile | undefined {
  const candidates = [
    resolve(process.cwd(), "packages/shared/src/addresses.json"),
    resolve(process.cwd(), "../../packages/shared/src/addresses.json"),
    resolve(process.cwd(), "../packages/shared/src/addresses.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    return JSON.parse(readFileSync(path, "utf8")) as AddressesFile;
  }
  return undefined;
}

export function loadConfig() {
  const file = loadAddressesFile();
  const hedera = file?.["hedera-testnet"];
  const arc = file?.["arc-testnet"];
  return {
    hederaChainId: HEDERA_CHAIN_ID,
    arcChainId: ARC_CHAIN_ID,
    exitAuction:
      optionalAddress(process.env.NEXT_PUBLIC_EXIT_AUCTION_ADDRESS) ??
      optionalAddress(hedera?.exitAuction),
    bondToken:
      optionalAddress(process.env.NEXT_PUBLIC_BOND_TOKEN_ADDRESS) ??
      optionalAddress(hedera?.bondToken),
    bidEscrow:
      optionalAddress(process.env.NEXT_PUBLIC_BID_ESCROW_ADDRESS) ??
      optionalAddress(arc?.bidEscrow),
    usdc:
      optionalAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS) ??
      optionalAddress(arc?.usdc) ??
      getAddress(USDC_ADDRESS),
    hederaRpc:
      process.env.NEXT_PUBLIC_HEDERA_RPC_URL ?? "https://testnet.hashio.io/api",
    arcRpc: process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.io",
    addressesFile: file ?? {},
    awardMode: process.env.AWARD_MODE === "local" ? "local" : "cre",
    creTriggerUrl: process.env.CRE_TRIGGER_URL ?? "http://127.0.0.1:2000",
  };
}

export function requireAddress(
  value: Address | undefined,
  label: string,
): Address {
  if (!value) {
    throw new ApiError(500, ErrorCode.CONFIG, `${label} is not configured`);
  }
  return value;
}

export function parseAddress(value: string | undefined, label: string): Address {
  if (!value || !isAddress(value)) {
    throw new ApiError(400, ErrorCode.INVALID_ADDRESS, `invalid ${label}`);
  }
  return getAddress(value);
}

export function mockSanctions(): Set<string> {
  const raw = process.env.MOCK_SANCTIONS_LIST ?? "";
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed && isAddress(trimmed)) set.add(getAddress(trimmed).toLowerCase());
  }
  return set;
}
