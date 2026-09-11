// server-only — L5 backend. Do not import from client components.
import {
  getAddress,
  isAddress,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import exitAuctionAbiJson from "../../../packages/shared/src/abi/ExitAuction.json";
import atsAbiJson from "../../../packages/shared/src/abi/IATSBond.json";
import { HEDERA_CHAIN_ID } from "../../../packages/shared/src/chains";
import { computeRef } from "../../../packages/shared/src/ref";
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

export const exitAuctionAbi = exitAuctionAbiJson as Abi;
export const atsAbi = atsAbiJson as Abi;

export type HederaAuction = {
  id: bigint;
  token: Address;
  seller: Address;
  partition: Hex;
  holdId: bigint;
  amount: bigint;
  deadline: bigint;
  createdAt: bigint;
  reserveCommitment: Hex;
  status: number;
  winner: Address;
  ref: Hex;
};

const HEDERA_STATUS = ["None", "Open", "Settled", "Cancelled"] as const;

export function hederaStatusName(status: number): (typeof HEDERA_STATUS)[number] {
  return HEDERA_STATUS[status] ?? "None";
}

function asAuction(id: bigint, raw: unknown): HederaAuction {
  const r = raw as Record<string, unknown> & unknown[];
  const pick = (name: string, index: number) =>
    (r as Record<string, unknown>)[name] ?? r[index];
  return {
    id,
    token: pick("token", 0) as Address,
    seller: pick("seller", 1) as Address,
    partition: pick("partition", 2) as Hex,
    holdId: BigInt(pick("holdId", 3) as bigint),
    amount: BigInt(pick("amount", 4) as bigint),
    deadline: BigInt(pick("deadline", 5) as bigint),
    createdAt: BigInt(pick("createdAt", 6) as bigint),
    reserveCommitment: pick("reserveCommitment", 7) as Hex,
    status: Number(pick("status", 8)),
    winner: pick("winner", 9) as Address,
    ref: pick("ref", 10) as Hex,
  };
}

export function isPresent(auction: HederaAuction): boolean {
  return auction.status !== 0 && isAddress(auction.token) && auction.token !== "0x0000000000000000000000000000000000000000";
}

export function exitAuctionAddress(): Address {
  return requireAddress(loadConfig().exitAuction, "ExitAuction");
}

export async function readAuctionCount(): Promise<bigint> {
  const address = loadConfig().exitAuction;
  if (!address) return 0n;
  return hederaPublic().readContract({
    address,
    abi: exitAuctionAbi,
    functionName: "auctionCount",
  }) as Promise<bigint>;
}

export async function getHederaAuction(id: bigint): Promise<HederaAuction> {
  const address = exitAuctionAddress();
  const raw = await hederaPublic().readContract({
    address,
    abi: exitAuctionAbi,
    functionName: "getAuction",
    args: [id],
  });
  return asAuction(id, raw);
}

export async function getHederaAuctions(): Promise<HederaAuction[]> {
  const address = loadConfig().exitAuction;
  if (!address) return [];
  const count = await readAuctionCount();
  if (count === 0n) return [];
  const raw = (await hederaPublic().readContract({
    address,
    abi: exitAuctionAbi,
    functionName: "getAuctions",
    args: [0n, count],
  })) as unknown[];
  return raw.map((item, index) => asAuction(BigInt(index + 1), item)).filter(isPresent);
}

export async function idByRef(ref: Hex): Promise<bigint> {
  const address = loadConfig().exitAuction;
  if (!address) return 0n;
  return hederaPublic().readContract({
    address,
    abi: exitAuctionAbi,
    functionName: "idByRef",
    args: [ref],
  }) as Promise<bigint>;
}

export function refFor(id: bigint): Hex {
  return computeRef(HEDERA_CHAIN_ID, exitAuctionAddress(), id);
}

export async function tokenMeta(
  token: Address,
): Promise<{ name: string; symbol: string }> {
  try {
    const [name, symbol] = await Promise.all([
      hederaPublic().readContract({
        address: token,
        abi: atsAbi,
        functionName: "name",
      }) as Promise<string>,
      hederaPublic().readContract({
        address: token,
        abi: atsAbi,
        functionName: "symbol",
      }) as Promise<string>,
    ]);
    return { name, symbol };
  } catch {
    return { name: "ATS Bond", symbol: "BOND" };
  }
}

export async function previewSettleOnchain(
  id: bigint,
  to: Address,
): Promise<{ ok: boolean; code: Hex; reason: Hex }> {
  const raw = (await hederaPublic().readContract({
    address: exitAuctionAddress(),
    abi: exitAuctionAbi,
    functionName: "previewSettle",
    args: [id, to],
  })) as [boolean, Hex, Hex];
  return { ok: raw[0], code: raw[1], reason: raw[2] };
}

export async function settleOnHedera(
  id: bigint,
  winner: Address,
): Promise<Hex> {
  return onHedera(async () => {
    const hash = await hederaWallet().writeContract({
      address: exitAuctionAddress(),
      abi: exitAuctionAbi,
      functionName: "settle",
      args: [id, winner],
      account: operatorAccount(),
      chain: hederaWallet().chain,
      gas: HEDERA_GAS.settle,
    });
    const receipt = await waitHedera(hash);
    if (receipt.status === "reverted") {
      throw new ApiError(500, ErrorCode.UNKNOWN, "settle reverted");
    }
    return hash;
  });
}

export async function cancelOnHedera(id: bigint): Promise<Hex> {
  return onHedera(async () => {
    const hash = await hederaWallet().writeContract({
      address: exitAuctionAddress(),
      abi: exitAuctionAbi,
      functionName: "cancel",
      args: [id],
      account: operatorAccount(),
      chain: hederaWallet().chain,
      gas: HEDERA_GAS.cancel,
    });
    await waitHedera(hash);
    return hash;
  });
}

export async function getOperatorHbar(): Promise<bigint> {
  try {
    const account = operatorAccount();
    return hederaPublic().getBalance({ address: account.address });
  } catch {
    const file = loadConfig().addressesFile as {
      demoWallets?: { operator?: string };
    };
    const op = file.demoWallets?.operator;
    if (op && isAddress(op)) {
      return hederaPublic().getBalance({ address: getAddress(op) });
    }
    return 0n;
  }
}
