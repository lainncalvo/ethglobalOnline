import { requireComplianceKey } from "@/lib/auth";
import { complianceScreen } from "@/lib/handlers/compliance";
import { handle, readJson } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handle(async () => {
    requireComplianceKey(req);
    const body = await readJson<{
      token?: string;
      seller?: string;
      partition?: string;
      amount?: string;
      candidates?: string[];
    }>(req);
    return complianceScreen(body);
  });
}
