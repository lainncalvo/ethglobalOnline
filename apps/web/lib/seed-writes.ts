// server-only — L5 backend. Seller/buyer writes used by scripts/demo/seed.ts.
import {
  parseEventLogs,
  type Account,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { HEDERA_GAS, hederaWallet, onHedera, waitHedera } from "./clients";
import { ApiError, ErrorCode } from "./errors";
import {
  atsAbi,
  exitAuctionAbi,
  exitAuctionAddress,
  getHederaAuction,
  readAuctionCount,
} from "./hedera";

export async function createAuctionOnHedera(
  account: Account,
  args: {
    token: Address;
    partition: Hex;
    holdId: bigint;
    amount: bigint;
    deadline: bigint;
    reserveCommitment: Hex;
  },
): Promise<{ id: bigint; ref: Hex; txHash: Hex }> {
  return onHedera(async () => {
    const wallet = hederaWallet(account);
    const hash = await wallet.writeContract({
      address: exitAuctionAddress(),
      abi: exitAuctionAbi,
      functionName: "createAuction",
      args: [
        args.token,
        args.partition,
        args.holdId,
        args.amount,
        args.deadline,
        args.reserveCommitment,
      ],
      account,
      chain: wallet.chain,
      gas: HEDERA_GAS.createAuction,
    });
    const receipt = await waitHedera(hash);
    if (receipt.status === "reverted") {
      throw new ApiError(500, ErrorCode.UNKNOWN, "createAuction reverted");
    }
    const count = await readAuctionCount();
    const auction = await getHederaAuction(count);
    return { id: count, ref: auction.ref, txHash: hash };
  });
}

export async function createHold(
  account: Account,
  args: {
    token: Address;
    partition: Hex;
    amount: bigint;
    expiration: bigint;
    escrow: Address;
  },
): Promise<{ holdId: bigint; txHash: Hex }> {
  const wallet = hederaWallet(account);
  const hash = await wallet.writeContract({
    address: args.token,
    abi: atsAbi,
    functionName: "createHoldByPartition",
    args: [
      args.partition,
      {
        amount: args.amount,
        expirationTimestamp: args.expiration,
        escrow: args.escrow,
        to: "0x0000000000000000000000000000000000000000" as Address,
        data: "0x" as Hex,
      },
    ],
    account,
    chain: wallet.chain,
    gas: HEDERA_GAS.createHold,
  });
  const receipt = await waitHedera(hash);
  const holdId = parseHoldId(receipt.logs);
  return { holdId, txHash: hash };
}

/** ATS also emits TransferByPartition; word[1] there is the amount, not holdId. */
function parseHoldId(logs: TransactionReceipt["logs"]): bigint {
  const parsed = parseEventLogs({
    abi: atsAbi,
    eventName: "HeldByPartition",
    logs,
  });
  const holdId = parsed[0]?.args.holdId;
  if (holdId === undefined) {
    throw new ApiError(500, ErrorCode.UNKNOWN, "HeldByPartition holdId not found");
  }
  return holdId;
}
