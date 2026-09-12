import { requireOperator } from "@/lib/auth";
import { closeHederaRail } from "@/lib/handlers/hedera-rail";
import { handle } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;
  return handle(async () => {
    requireOperator(req);
    return closeHederaRail(ref);
  });
}
