import { requireOperator } from "@/lib/auth";
import { settlePreview } from "@/lib/handlers/settle";
import { handle, readJson } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;
  return handle(async () => {
    requireOperator(req);
    const body = await readJson<{ to?: string }>(req);
    return settlePreview(ref, body.to ?? "");
  });
}
