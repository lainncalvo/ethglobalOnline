import { registerAuction } from "@/lib/handlers/register";
import { handle, readJson } from "@/lib/json";
import { loadAuctionList } from "@/lib/views";

export const runtime = "nodejs";

export async function GET() {
  return handle(async () => ({ auctions: await loadAuctionList() }));
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson<{ hederaAuctionId?: string | number }>(req);
    if (body.hederaAuctionId === undefined || body.hederaAuctionId === "") {
      const { ApiError, ErrorCode } = await import("@/lib/errors");
      throw new ApiError(400, ErrorCode.INVALID_BODY, "hederaAuctionId is required");
    }
    return registerAuction(body.hederaAuctionId);
  });
}
