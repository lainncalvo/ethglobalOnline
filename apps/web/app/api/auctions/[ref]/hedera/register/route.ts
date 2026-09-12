import { handle } from "@/lib/json";
import { registerHederaRail } from "@/lib/handlers/hedera-rail";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;
  return handle(() => registerHederaRail(ref));
}
