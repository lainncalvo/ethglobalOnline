// server-only — L5 backend. Do not import from client components.
import { getAddress, type Hex } from "viem";
import { DEFAULT_PARTITION } from "../../../../packages/shared/src/chains";
import { asByteCode, reasonText } from "../eip1066";
import { ApiError, ErrorCode } from "../errors";
import { screenCandidate, screenCandidates } from "../screening";
import { loadConfig, parseAddress } from "../server-config";

export async function complianceStatus(addressRaw: string | null) {
  const cfg = loadConfig();
  if (!cfg.bondToken) {
    throw new ApiError(500, ErrorCode.CONFIG, "bond token is not configured");
  }
  const address = parseAddress(addressRaw ?? undefined, "address");
  const seller = getAddress(
    (
      cfg.addressesFile as { demoWallets?: { seller?: string } }
    ).demoWallets?.seller ?? address,
  );
  const row = await screenCandidate(
    cfg.bondToken,
    seller,
    DEFAULT_PARTITION,
    1n,
    address,
  );
  return {
    whitelisted: row.whitelisted,
    kyc: row.kyc === "GRANTED",
    canReceive: row.canTransfer,
    code: row.code,
    reasonText: reasonText(row.canTransfer, row.code, row.reason),
  };
}

export async function complianceScreen(body: {
  token?: string;
  seller?: string;
  partition?: string;
  amount?: string;
  candidates?: string[];
}) {
  if (!body.token || !body.seller || !body.amount || !body.candidates) {
    throw new ApiError(
      400,
      ErrorCode.INVALID_BODY,
      "token, seller, amount and candidates are required",
    );
  }
  if (body.candidates.length > 20) {
    throw new ApiError(
      400,
      ErrorCode.TOO_MANY_CANDIDATES,
      "candidates cap is 20",
    );
  }
  return screenCandidates({
    token: body.token,
    seller: body.seller,
    partition: (body.partition ?? DEFAULT_PARTITION) as Hex,
    amount: body.amount,
    candidates: body.candidates,
  });
}
