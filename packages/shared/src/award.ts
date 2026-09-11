import {
  concat,
  encodeAbiParameters,
  encodePacked,
  keccak256,
  type Address,
  type Hex,
} from "viem";

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

export const OUTCOME_AWARDED = 1;
export const OUTCOME_NO_COMPLIANT_BID = 2;
export const OUTCOME_ALL_BELOW_RESERVE = 3;
export const OUTCOME_NO_BIDS = 4;

export type AwardOutcome = 1 | 2 | 3 | 4;

export type SnapshotBid = {
  bidder: Address;
  amount: string;
};

export type Snapshot = {
  ref: Hex;
  deadline: number;
  seller: Address;
  reserveCommitment: Hex;
  bids: SnapshotBid[];
  reserve: { value: string; salt: Hex };
  hedera: {
    token: Address;
    partition: Hex;
    amount: string;
    seller: Address;
    auctionId: string;
  };
};

export type ScreeningRow = {
  address: Address;
  whitelisted: boolean;
  kyc: "GRANTED" | "NOT_GRANTED";
  sanctions: "CLEAR" | "HIT";
  canTransfer: boolean;
  code: Hex;
  reason: string;
};

export type Screening = ScreeningRow[];

export type Award = {
  outcome: AwardOutcome;
  winner: Address;
  clearingPrice: bigint;
  reserveCommitment: Hex;
  bidsDigest: Hex;
  eligible: number;
};

export class CommitmentMismatch extends Error {
  constructor() {
    super("CommitmentMismatch");
    this.name = "CommitmentMismatch";
  }
}

/** Sealed-reserve commitment: keccak256(abi.encode(uint256, bytes32)). */
export function computeReserveCommitment(value: string, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "bytes32" }],
      [BigInt(value), salt],
    ),
  );
}

/**
 * keccak256(abi.encodePacked(bidder_i, amount_i)...) in snapshot order.
 * Empty book hashes the empty byte string.
 */
export function computeBidsDigest(bids: SnapshotBid[]): Hex {
  if (bids.length === 0) {
    return keccak256("0x");
  }
  return keccak256(
    concat(
      bids.map((bid) =>
        encodePacked(
          ["address", "uint256"],
          [bid.bidder, BigInt(bid.amount)],
        ),
      ),
    ),
  );
}

function isEligible(
  bidder: Address,
  byAddress: Map<string, ScreeningRow>,
): boolean {
  const row = byAddress.get(bidder.toLowerCase());
  if (!row) return false;
  return (
    row.whitelisted &&
    row.kyc === "GRANTED" &&
    row.sanctions === "CLEAR" &&
    row.canTransfer
  );
}

export function computeAward(
  snapshot: Snapshot,
  screening: Screening,
): Award {
  const commitment = computeReserveCommitment(
    snapshot.reserve.value,
    snapshot.reserve.salt,
  );
  if (commitment.toLowerCase() !== snapshot.reserveCommitment.toLowerCase()) {
    throw new CommitmentMismatch();
  }

  const byAddress = new Map<string, ScreeningRow>();
  for (const row of screening) {
    byAddress.set(row.address.toLowerCase(), row);
  }

  const reserve = BigInt(snapshot.reserve.value);
  const indexed = snapshot.bids.map((bid, index) => ({ bid, index }));
  const eligible = indexed.filter(({ bid }) =>
    isEligible(bid.bidder, byAddress),
  );

  // Highest amount first; equal amounts keep the earlier snapshot index.
  eligible.sort((a, b) => {
    const delta = BigInt(b.bid.amount) - BigInt(a.bid.amount);
    if (delta !== 0n) return delta > 0n ? 1 : -1;
    return a.index - b.index;
  });

  const bidsDigest = computeBidsDigest(snapshot.bids);
  const base = {
    reserveCommitment: commitment,
    bidsDigest,
    eligible: eligible.length,
  };

  if (snapshot.bids.length === 0) {
    return {
      ...base,
      outcome: OUTCOME_NO_BIDS,
      winner: ZERO_ADDRESS,
      clearingPrice: 0n,
    };
  }
  if (eligible.length === 0) {
    return {
      ...base,
      outcome: OUTCOME_NO_COMPLIANT_BID,
      winner: ZERO_ADDRESS,
      clearingPrice: 0n,
    };
  }

  const winner = eligible.find(({ bid }) => BigInt(bid.amount) >= reserve);
  if (!winner) {
    return {
      ...base,
      outcome: OUTCOME_ALL_BELOW_RESERVE,
      winner: ZERO_ADDRESS,
      clearingPrice: 0n,
    };
  }

  return {
    ...base,
    outcome: OUTCOME_AWARDED,
    winner: winner.bid.bidder,
    clearingPrice: BigInt(winner.bid.amount),
  };
}
