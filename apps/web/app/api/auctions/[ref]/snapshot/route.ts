import { requireAwardKey } from "@/lib/auth";
import { handle } from "@/lib/json";
import { requireRef } from "@/lib/refs";
import { buildSnapshot } from "@/lib/snapshot";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  return handle(async () => {
    requireAwardKey(req);
    const { ref } = await ctx.params;
    return buildSnapshot(requireRef(ref));
  });
}
