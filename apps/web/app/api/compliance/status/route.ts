import { complianceStatus } from "@/lib/handlers/compliance";
import { handle } from "@/lib/json";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  return handle(() => complianceStatus(address));
}
