import { handle } from "@/lib/json";
import { loadAuctionDetail } from "@/lib/views";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;
  return handle(() => loadAuctionDetail(ref));
}
