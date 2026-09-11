/**
 * Local snapshot/screen stub for `cre workflow simulate` before L5 exists.
 * Serves the frozen demo lot. Does not log reserve, salt, keys, or verdicts.
 */
import { encodeAbiParameters, keccak256 } from "viem";

const AWARD_KEY = process.env.AWARD_API_KEY ?? "dev-award-key";
const COMPLIANCE_KEY = process.env.COMPLIANCE_API_KEY ?? "dev-compliance-key";
const PORT = Number(process.env.STUB_PORT ?? "3000");

const SELLER = "0xE789FA2538505252B5dCeAe9250705046640A7D4";
const BUYER_A = "0x39E24D0C0a464a9249A908Cc6727cFd69Be8c1F9";
const BUYER_B = "0xC728d5658e1256330D842607A6029C0d06727435";
const TOKEN = "0x1111111111111111111111111111111111111111";
const PARTITION =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
const SALT =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

/** Demo lot amounts (USDC 6-dec). Not printed. */
const RESERVE = 1_000_000n;
const BID_A = "1000000";
const BID_B = "2000000";
const BID_LOW_A = "500000";
const BID_LOW_B = "800000";

const AWARD_REF =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NOWINNER_REF =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const reserveCommitment = keccak256(
  encodeAbiParameters(
    [{ type: "uint256" }, { type: "bytes32" }],
    [RESERVE, SALT],
  ),
);

function snapshot(ref: string, amounts: [string, string]) {
  return {
    ref,
    deadline: 1_800_000_000,
    seller: SELLER,
    reserveCommitment,
    bids: [
      { bidder: BUYER_A, amount: amounts[0] },
      { bidder: BUYER_B, amount: amounts[1] },
    ],
    reserve: { value: RESERVE.toString(), salt: SALT },
    hedera: {
      token: TOKEN,
      partition: PARTITION,
      amount: "10",
      seller: SELLER,
      auctionId: "1",
    },
  };
}

function screening() {
  return [BUYER_A, BUYER_B].map((address) => ({
    address,
    whitelisted: true,
    kyc: "GRANTED",
    sanctions: "CLEAR",
    canTransfer: true,
    code: "0x01",
    reason: "ok",
  }));
}

function unauthorized(req: Request, header: string, expected: string): Response | null {
  const got = req.headers.get(header);
  if (got !== expected) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "missing or wrong key" } },
      { status: 401 },
    );
  }
  return null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    const snapshotMatch = url.pathname.match(
      /^\/api\/auctions\/(0x[0-9a-fA-F]{64})\/snapshot$/,
    );
    if (req.method === "GET" && snapshotMatch) {
      const denied = unauthorized(req, "x-award-api-key", AWARD_KEY);
      if (denied) return denied;
      const ref = snapshotMatch[1].toLowerCase();
      if (ref === AWARD_REF) {
        return Response.json(snapshot(AWARD_REF, [BID_A, BID_B]));
      }
      if (ref === NOWINNER_REF) {
        return Response.json(snapshot(NOWINNER_REF, [BID_LOW_A, BID_LOW_B]));
      }
      return Response.json(
        { error: { code: "NOT_FOUND", message: "unknown ref" } },
        { status: 404 },
      );
    }

    if (req.method === "POST" && url.pathname === "/api/compliance/screen") {
      const denied = unauthorized(req, "x-compliance-api-key", COMPLIANCE_KEY);
      if (denied) return denied;
      return Response.json(screening());
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`stub listening on http://127.0.0.1:${server.port}`);
