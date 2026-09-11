import { requireOperator } from "@/lib/auth";
import { cancelAuction } from "@/lib/handlers/operator";
import { handle } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;
  return handle(async () => {
    requireOperator(req);
    return cancelAuction(ref);
  });
}
