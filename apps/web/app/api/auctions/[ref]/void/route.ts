import { requireOperator } from "@/lib/auth";
import { voidAuction } from "@/lib/handlers/operator";
import { handle, readJson } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;
  return handle(async () => {
    requireOperator(req);
    const body = await readJson<{ reason?: string }>(req);
    return voidAuction(ref, body.reason ?? "");
  });
}
