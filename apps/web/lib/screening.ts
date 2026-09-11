// server-only — L5 backend. Do not import from client components.
import { getAddress, type Address, type Hex } from "viem";
import type { Screening, ScreeningRow } from "../../../packages/shared/src/award";
import { hederaPublic } from "./clients";
import { atsAbi } from "./hedera";
import { asByteCode, asReasonHex } from "./eip1066";
import { mockSanctions, parseAddress } from "./server-config";

const KYC_GRANTED = 1;

export async function screenCandidate(
  token: Address,
  seller: Address,
  partition: Hex,
  amount: bigint,
  candidate: Address,
): Promise<ScreeningRow> {
  const client = hederaPublic();
  const [whitelisted, kycRaw, transfer] = await Promise.all([
    client.readContract({
      address: token,
      abi: atsAbi,
      functionName: "isInControlList",
      args: [candidate],
    }) as Promise<boolean>,
    client.readContract({
      address: token,
      abi: atsAbi,
      functionName: "getKycStatusFor",
      args: [candidate],
    }) as Promise<number | bigint>,
    // ATS evaluates msg.sender. A zero-address eth_call looks like an
    // unlisted caller and returns 0x10 / AccountIsBlocked for everyone.
    client.readContract({
      address: token,
      abi: atsAbi,
      functionName: "canTransferByPartition",
      args: [seller, candidate, partition, amount, "0x", "0x"],
      account: seller,
    }) as Promise<[boolean, Hex, Hex]>,
  ]);
  const kycGranted = Number(kycRaw) === KYC_GRANTED;
  const hit = mockSanctions().has(candidate.toLowerCase());
  return {
    address: getAddress(candidate),
    whitelisted,
    kyc: kycGranted ? "GRANTED" : "NOT_GRANTED",
    sanctions: hit ? "HIT" : "CLEAR",
    canTransfer: transfer[0],
    code: asByteCode(transfer[1]),
    reason: asReasonHex(transfer[2]),
  };
}

export async function screenCandidates(args: {
  token: string;
  seller: string;
  partition: Hex;
  amount: string;
  candidates: string[];
}): Promise<Screening> {
  const token = parseAddress(args.token, "token");
  const seller = parseAddress(args.seller, "seller");
  const amount = BigInt(args.amount);
  const rows: Screening = [];
  for (const raw of args.candidates) {
    const candidate = parseAddress(raw, "candidate");
    rows.push(
      await screenCandidate(token, seller, args.partition, amount, candidate),
    );
  }
  return rows;
}
