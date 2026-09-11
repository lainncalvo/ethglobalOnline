import { getAddress, isAddress, type Address } from "viem";
import { ACTOR_LABELS } from "./constants";

function envAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || !isAddress(trimmed)) return undefined;
  return getAddress(trimmed);
}

export function getPublicAddresses() {
  return {
    exitAuction: envAddress(process.env.NEXT_PUBLIC_EXIT_AUCTION_ADDRESS),
    bidEscrow: envAddress(process.env.NEXT_PUBLIC_BID_ESCROW_ADDRESS),
    bondToken: envAddress(process.env.NEXT_PUBLIC_BOND_TOKEN_ADDRESS),
    usdc:
      envAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS) ??
      ("0x3600000000000000000000000000000000000000" as Address),
  };
}

export function actorLabel(address: string | undefined): string | undefined {
  if (!address) return undefined;
  return ACTOR_LABELS[address.toLowerCase()];
}
