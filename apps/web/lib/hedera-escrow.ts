// server-only — Hedera USDC bid rail. Do not import from client components.
import { getAddress, isAddress, type Abi, type Address, type Hex } from "viem";
import bidEscrowAbiJson from "../../../packages/shared/src/abi/BidEscrow.json";
import { HEDERA_USDC_DEFAULT } from "./hedera-addresses";
import {
  HEDERA_GAS,
  hederaPublic,
  hederaWallet,
  onHedera,
  operatorAccount,
  waitHedera,
} from "./clients";
import { ApiError, ErrorCode } from "./errors";
import { loadConfig, requireAddress } from "./server-config";

export const hederaBidEscrowAbi = bidEscrowAbiJson as Abi;

export type HederaRailAuction = {
  seller: Address;
  deadline: bigint;
  awardedAt: bigint;
  reserveCommitment: Hex;
  status: number;
  winner: Address;
  clearingPrice: bigint;
  source: number;
  hederaTxHash: Hex;
  hederaAuctionId: bigint;
  totalEscrowed: bigint;
};

export type HederaRailBid = { bidder: Address; amount: bigint };

const STATUS = [
  "None",
  "Bidding",
  "Awarded",
  "Settled",
  "Voided",
  "Cancelled",
  "Expired",
  "NoWinner",
] as const;

const ESCROW_GAS = {
  register: HEDERA_GAS.createAuction,
  award: 1_000_000n,
  confirm: 1_500_000n,
  cancel: HEDERA_GAS.cancel,
} as const;

function optionalAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || !isAddress(trimmed)) return undefined;
  return getAddress(trimmed);
}

export function hederaRailAddresses() {
  const file = loadConfig().addressesFile as {
    "hedera-testnet"?: { hederaBidEscrow?: string; hederaUsdc?: string };
  };
  const net = file["hedera-testnet"];
  return {
    escrow:
      optionalAddress(process.env.NEXT_PUBLIC_HEDERA_BID_ESCROW_ADDRESS) ??
      optionalAddress(net?.hederaBidEscrow),
    usdc:
      optionalAddress(process.env.NEXT_PUBLIC_HEDERA_USDC_ADDRESS) ??
      optionalAddress(net?.hederaUsdc) ??
      HEDERA_USDC_DEFAULT,
  };
}

export function hederaRailEscrowAddress(): Address {
  return requireAddress(hederaRailAddresses().escrow, "HederaBidEscrow");
}

export function hederaRailStatusName(status: number): (typeof STATUS)[number] {
  return STATUS[status] ?? "None";
}

function asAuction(raw: unknown): HederaRailAuction {
  const r = raw as Record<string, unknown> & unknown[];
  const pick = (name: string, index: number) =>
    (r as Record<string, unknown>)[name] ?? r[index];
  return {
    seller: pick("seller", 0) as Address,
    deadline: BigInt(pick("deadline", 1) as bigint),
    awardedAt: BigInt(pick("awardedAt", 2) as bigint),
    reserveCommitment: pick("reserveCommitment", 3) as Hex,
    status: Number(pick("status", 4)),
    winner: pick("winner", 5) as Address,
    clearingPrice: BigInt(pick("clearingPrice", 6) as bigint),
    source: Number(pick("source", 7)),
    hederaTxHash: pick("hederaTxHash", 8) as Hex,
    hederaAuctionId: BigInt(pick("hederaAuctionId", 9) as bigint),
    totalEscrowed: BigInt(pick("totalEscrowed", 10) as bigint),
  };
}

const EMPTY: HederaRailAuction = {
  seller: "0x0000000000000000000000000000000000000000",
  deadline: 0n,
  awardedAt: 0n,
  reserveCommitment:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  status: 0,
  winner: "0x0000000000000000000000000000000000000000",
  clearingPrice: 0n,
  source: 0,
  hederaTxHash:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  hederaAuctionId: 0n,
  totalEscrowed: 0n,
};

export async function getHederaRailAuction(ref: Hex): Promise<HederaRailAuction> {
  const address = hederaRailAddresses().escrow;
  if (!address) return EMPTY;
  const raw = await hederaPublic().readContract({
    address,
    abi: hederaBidEscrowAbi,
    functionName: "getAuction",
    args: [ref],
  });
  return asAuction(raw);
}

export async function getHederaRailBids(ref: Hex): Promise<HederaRailBid[]> {
  const address = hederaRailAddresses().escrow;
  if (!address) return [];
  const raw = (await hederaPublic().readContract({
    address,
    abi: hederaBidEscrowAbi,
    functionName: "getBids",
    args: [ref],
  })) as [Address[], bigint[]];
  const [bidders, amounts] = raw;
  return bidders.map((bidder, i) => ({ bidder, amount: amounts[i] ?? 0n }));
}

async function writeHederaRail(
  functionName: string,
  args: readonly unknown[],
  gas: bigint,
): Promise<Hex> {
  return onHedera(async () => {
    const hash = await hederaWallet().writeContract({
      address: hederaRailEscrowAddress(),
      abi: hederaBidEscrowAbi,
      functionName,
      args: args as never,
      account: operatorAccount(),
      chain: hederaWallet().chain,
      gas,
    });
    const receipt = await waitHedera(hash);
    if (receipt.status === "reverted") {
      throw new ApiError(500, ErrorCode.UNKNOWN, `${functionName} reverted`);
    }
    return hash;
  });
}

export function registerOnHederaRail(args: {
  ref: Hex;
  seller: Address;
  deadline: bigint;
  reserveCommitment: Hex;
  hederaAuctionId: bigint;
}): Promise<Hex> {
  return writeHederaRail(
    "registerAuction",
    [args.ref, args.seller, args.deadline, args.reserveCommitment, args.hederaAuctionId],
    ESCROW_GAS.register,
  );
}

export function awardByOperatorOnHederaRail(args: {
  ref: Hex;
  winner: Address;
  clearingPrice: bigint;
  reserveCommitment: Hex;
  outcome: number;
  bidsDigest: Hex;
}): Promise<Hex> {
  return writeHederaRail(
    "awardByOperator",
    [
      args.ref,
      args.winner,
      args.clearingPrice,
      args.reserveCommitment,
      args.outcome,
      args.bidsDigest,
    ],
    ESCROW_GAS.award,
  );
}

export function confirmDeliveryOnHederaRail(
  ref: Hex,
  hederaTxHash: Hex,
): Promise<Hex> {
  return writeHederaRail("confirmDelivery", [ref, hederaTxHash], ESCROW_GAS.confirm);
}

export function cancelHederaRail(ref: Hex): Promise<Hex> {
  return writeHederaRail("cancelAuction", [ref], ESCROW_GAS.cancel);
}

export function voidHederaRail(ref: Hex, reason: string): Promise<Hex> {
  return writeHederaRail("voidAward", [ref, reason], ESCROW_GAS.cancel);
}
