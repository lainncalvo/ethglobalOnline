import { getAddress, isAddress, type Address } from "viem";
import addressesFile from "../../../packages/shared/src/addresses.json";

/** Hedera testnet USDC HTS 0.0.429274 as an EVM long-zero address (0x68cda). */
export const HEDERA_USDC_DEFAULT =
  "0x0000000000000000000000000000000000068cDa" as Address;

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
  const envRaw = process.env.NEXT_PUBLIC_HEDERA_BID_ESCROW_ADDRESS;
  const fileRaw = addressesFile["hedera-testnet"]?.hederaBidEscrow;
  return {
    hederaBidEscrow: envAddress(envRaw) ?? envAddress(fileRaw),
    hederaUsdc:
      envAddress(process.env.NEXT_PUBLIC_HEDERA_USDC_ADDRESS) ??
      envAddress(addressesFile["hedera-testnet"]?.hederaUsdc) ??
      HEDERA_USDC_DEFAULT,
  };
}
