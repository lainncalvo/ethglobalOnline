import { requireOperator } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { closeAuction } from "@/lib/handlers/close";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  try {
    requireOperator(req);
    const { ref } = await ctx.params;
    const result = await closeAuction(ref);
    return Response.json(result, {
      status: result.mode === "cre" ? 202 : 200,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
