import { getAddress, isAddress, type Address } from "viem";

/** Hedera testnet USDC HTS 0.0.429274 as an EVM long-zero address. */
export const HEDERA_USDC_DEFAULT =
  "0x0000000000000000000000000000000000068c9a" as Address;

export const htsAssociateAbi = [
  {
    type: "function",
    name: "associate",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ type: "int64" }],
  },
] as const;

function envAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || !isAddress(trimmed)) return undefined;
  return getAddress(trimmed);
}

export function getHederaRailAddresses() {
  return {
    hederaBidEscrow: envAddress(process.env.NEXT_PUBLIC_HEDERA_BID_ESCROW_ADDRESS),
    hederaUsdc:
      envAddress(process.env.NEXT_PUBLIC_HEDERA_USDC_ADDRESS) ?? HEDERA_USDC_DEFAULT,
  };
}
