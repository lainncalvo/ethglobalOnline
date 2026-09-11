import {
  encodeAbiParameters,
  isAddress,
  isHex,
  keccak256,
  type Address,
  type Hex,
} from "viem";

/** Cross-chain binding: keccak256(abi.encode(uint256 chainId, address exitAuction, uint256 auctionId)). */
export function computeRef(
  chainId: bigint | number,
  exitAuction: Address,
  auctionId: bigint | number | string,
): Hex {
  if (!isAddress(exitAuction)) {
    throw new Error("invalid exitAuction address");
  }
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }, { type: "uint256" }],
      [BigInt(chainId), exitAuction, BigInt(auctionId)],
    ),
  );
}

export function isRef(value: string): value is Hex {
  return isHex(value) && value.length === 66;
}

/** Normalize `0x` + 64 hex. Throws if the value is not a ref. */
export function parseRef(value: string): Hex {
  const trimmed = value.trim();
  if (!isRef(trimmed)) {
    throw new Error("invalid ref");
  }
  return trimmed.toLowerCase() as Hex;
}
