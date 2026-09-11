import { storeReserve } from "@/lib/handlers/reserve";
import { handle, readJson } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;
  return handle(async () => {
    const body = await readJson<{ reserve?: string; salt?: string }>(req);
    return storeReserve(ref, body);
  });
}
