import { defineChain, type Hex } from "viem";

export const HEDERA_CHAIN_ID = 296;
export const ARC_CHAIN_ID = 5_042_002;

export const DEFAULT_PARTITION =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

export const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;

export const USDC_DECIMALS = 6;

export const HASHSCAN_BASE = "https://hashscan.io/testnet";
export const ARCSCAN_BASE = "https://testnet.arcscan.app";

export const hederaTestnet = defineChain({
  id: HEDERA_CHAIN_ID,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.hashio.io/api"] },
  },
  blockExplorers: {
    default: { name: "HashScan", url: HASHSCAN_BASE },
  },
});

export const arcTestnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.io"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: ARCSCAN_BASE },
  },
});

export function hashscanContract(address: string): string {
  return `${HASHSCAN_BASE}/contract/${address}`;
}

export function hashscanTx(hash: string): string {
  return `${HASHSCAN_BASE}/transaction/${hash}`;
}

export function arcscanAddress(address: string): string {
  return `${ARCSCAN_BASE}/address/${address}`;
}

export function arcscanTx(hash: string): string {
  return `${ARCSCAN_BASE}/tx/${hash}`;
}

/** Whole USDC units → 6-decimal base units. */
export function usdc6(whole: bigint | number | string): bigint {
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS);
}
