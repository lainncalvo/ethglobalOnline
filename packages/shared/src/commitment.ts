import { encodeAbiParameters, isHex, keccak256, type Hex } from "viem";

/** Sealed reserve: keccak256(abi.encode(uint256 reserveUsdc6, bytes32 salt)). */
export function computeCommitment(
  reserveUsdc6: bigint | number | string,
  salt: Hex,
): Hex {
  if (!isHex(salt) || salt.length !== 66) {
    throw new Error("invalid salt");
  }
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "bytes32" }],
      [BigInt(reserveUsdc6), salt],
    ),
  );
}
