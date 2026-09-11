// server-only — L5 backend. Do not import from client components.
import {
  getAddress,
  isAddress,
  type Abi,
  type Account,
  type Address,
  type Hex,
} from "viem";
import bidEscrowAbiJson from "../../../packages/shared/src/abi/BidEscrow.json";
import erc20AbiJson from "../../../packages/shared/src/abi/ERC20.json";
import {
  ARC_TX_FEES,
  arcPublic,
  arcWallet,
  onArc,
  operatorAccount,
  waitArc,
} from "./clients";
import { ApiError, ErrorCode } from "./errors";
import { loadConfig, requireAddress } from "./server-config";

export const bidEscrowAbi = bidEscrowAbiJson as Abi;
export const erc20Abi = erc20AbiJson as Abi;

export type ArcAuction = {
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

export type BidRowOnchain = { bidder: Address; amount: bigint };

const ARC_STATUS = [
  "None",
  "Bidding",
  "Awarded",
  "Settled",
  "Voided",
  "Cancelled",
  "Expired",
  "NoWinner",
] as const;

const AWARD_SOURCE = ["None", "CRE", "Operator"] as const;

export function arcStatusName(status: number): (typeof ARC_STATUS)[number] {
  return ARC_STATUS[status] ?? "None";
}

export function awardSourceName(source: number): (typeof AWARD_SOURCE)[number] {
  return AWARD_SOURCE[source] ?? "None";
}

function asAuction(raw: unknown): ArcAuction {
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

export function bidEscrowAddress(): Address {
  return requireAddress(loadConfig().bidEscrow, "BidEscrow");
}

export async function getArcAuction(ref: Hex): Promise<ArcAuction> {
  const address = loadConfig().bidEscrow;
  if (!address) {
    return {
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
  }
  const raw = await arcPublic().readContract({
    address,
    abi: bidEscrowAbi,
    functionName: "getAuction",
    args: [ref],
  });
  return asAuction(raw);
}

export async function getArcBids(ref: Hex): Promise<BidRowOnchain[]> {
  const address = loadConfig().bidEscrow;
  if (!address) return [];
  const raw = (await arcPublic().readContract({
    address,
    abi: bidEscrowAbi,
    functionName: "getBids",
    args: [ref],
  })) as [Address[], bigint[]];
  const [bidders, amounts] = raw;
  return bidders.map((bidder, i) => ({ bidder, amount: amounts[i] ?? 0n }));
}

async function writeArc(
  functionName: string,
  args: readonly unknown[],
): Promise<Hex> {
  return onArc(async () => {
    const hash = await arcWallet().writeContract({
      address: bidEscrowAddress(),
      abi: bidEscrowAbi,
      functionName,
      args: args as never,
      account: operatorAccount(),
      chain: arcWallet().chain,
      ...ARC_TX_FEES,
    });
    const receipt = await waitArc(hash);
    if (receipt.status === "reverted") {
      throw new ApiError(500, ErrorCode.UNKNOWN, `${functionName} reverted`);
    }
    return hash;
  });
}

export function registerOnArc(args: {
  ref: Hex;
  seller: Address;
  deadline: bigint;
  reserveCommitment: Hex;
  hederaAuctionId: bigint;
}): Promise<Hex> {
  return writeArc("registerAuction", [
    args.ref,
    args.seller,
    args.deadline,
    args.reserveCommitment,
    args.hederaAuctionId,
  ]);
}

export function awardByOperatorOnArc(args: {
  ref: Hex;
  winner: Address;
  clearingPrice: bigint;
  reserveCommitment: Hex;
  outcome: number;
  bidsDigest: Hex;
}): Promise<Hex> {
  return writeArc("awardByOperator", [
    args.ref,
    args.winner,
    args.clearingPrice,
    args.reserveCommitment,
    args.outcome,
    args.bidsDigest,
  ]);
}

export function confirmDeliveryOnArc(ref: Hex, hederaTxHash: Hex): Promise<Hex> {
  return writeArc("confirmDelivery", [ref, hederaTxHash]);
}

export function voidAwardOnArc(ref: Hex, reason: string): Promise<Hex> {
  return writeArc("voidAward", [ref, reason]);
}

export function cancelAuctionOnArc(ref: Hex): Promise<Hex> {
  return writeArc("cancelAuction", [ref]);
}

export async function placeBidOnArc(args: {
  account: Account;
  ref: Hex;
  amount: bigint;
}): Promise<{ approveHash: Hex; bidHash: Hex }> {
  const escrow = bidEscrowAddress();
  const usdc = loadConfig().usdc;
  const wallet = arcWallet(args.account);
  const approveHash = await onArc(async () => {
    const hash = await wallet.writeContract({
      address: usdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, args.amount],
      account: args.account,
      chain: wallet.chain,
      ...ARC_TX_FEES,
    });
    await waitArc(hash);
    return hash;
  });
  const bidHash = await onArc(async () => {
    const hash = await wallet.writeContract({
      address: escrow,
      abi: bidEscrowAbi,
      functionName: "placeBid",
      args: [args.ref, args.amount],
      account: args.account,
      chain: wallet.chain,
      ...ARC_TX_FEES,
    });
    await waitArc(hash);
    return hash;
  });
  return { approveHash, bidHash };
}

export async function getOperatorUsdc(): Promise<bigint> {
  const usdc = loadConfig().usdc;
  try {
    const account = operatorAccount();
    return arcPublic().readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }) as Promise<bigint>;
  } catch {
    const file = loadConfig().addressesFile as {
      demoWallets?: { operator?: string };
    };
    const op = file.demoWallets?.operator;
    if (op && isAddress(op)) {
      return arcPublic().readContract({
        address: usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [getAddress(op)],
      }) as Promise<bigint>;
    }
    return 0n;
  }
}
