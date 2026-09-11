import {
  encodeAbiParameters,
  keccak256,
  parseEventLogs,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { atsBondAbi, exitAuctionAbi } from "./abi";
import { ARC_CHAIN_ID, ARC_TX_FEES } from "./constants";

export function computeCommitment(reserveUsdc6: bigint, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "bytes32" }],
      [reserveUsdc6, salt],
    ),
  );
}

export function randomSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function holdIdFromReceipt(receipt: TransactionReceipt): bigint {
  const logs = parseEventLogs({
    abi: atsBondAbi,
    eventName: "HeldByPartition",
    logs: receipt.logs,
  });
  const holdId = logs[0]?.args.holdId;
  if (holdId === undefined) {
    throw new Error("HeldByPartition event missing from receipt — cannot read holdId");
  }
  return holdId;
}

export function auctionCreatedFromReceipt(receipt: TransactionReceipt): {
  id: bigint;
  ref: Hex;
} {
  const logs = parseEventLogs({
    abi: exitAuctionAbi,
    eventName: "AuctionCreated",
    logs: receipt.logs,
  });
  const first = logs[0]?.args;
  if (first?.id === undefined || first.ref === undefined) {
    throw new Error("AuctionCreated event missing from receipt");
  }
  return { id: first.id, ref: first.ref };
}

type WriteArgs = {
  account: Address | Account;
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  chainId: number;
  gas?: bigint;
};

export async function writeAndWait(params: {
  walletClient: WalletClient;
  publicClient: PublicClient;
  requiredChainId: number;
  request: WriteArgs;
}): Promise<{ hash: Hex; receipt: TransactionReceipt }> {
  const fees = params.requiredChainId === ARC_CHAIN_ID ? ARC_TX_FEES : {};
  const hash = await params.walletClient.writeContract({
    ...params.request,
    ...fees,
    chain: params.walletClient.chain,
  } as never);
  const receipt = await params.publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 180_000,
  });
  if (receipt.status === "reverted") {
    throw new Error(`Transaction reverted: ${hash}`);
  }
  return { hash, receipt };
}
