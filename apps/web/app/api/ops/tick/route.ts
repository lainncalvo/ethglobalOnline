import { requireCron } from "@/lib/auth";
import { runTick } from "@/lib/handlers/tick";
import { handle } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handle(async () => {
    requireCron(req);
    return runTick();
  });
}
