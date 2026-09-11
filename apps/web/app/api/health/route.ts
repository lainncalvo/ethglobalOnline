import { health } from "@/lib/handlers/health";
import { handle } from "@/lib/json";

export const runtime = "nodejs";

export async function GET() {
  return handle(() => health());
}
