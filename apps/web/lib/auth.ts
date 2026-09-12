// server-only — L5 backend. Do not import from client components.
import { timingSafeEqual } from "node:crypto";
import { ApiError, ErrorCode } from "./errors";

function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function headerValue(req: Request, name: string): string {
  return req.headers.get(name)?.trim() ?? "";
}

function requireToken(
  provided: string,
  envName: string,
): void {
  const expected = process.env[envName] ?? "";
  if (!safeEqual(provided, expected)) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, "missing or invalid token");
  }
}

export function requireOperator(req: Request): void {
  const header = headerValue(req, "authorization");
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  requireToken(token, "OPERATOR_UI_TOKEN");
}

/** Bearer CRON_SECRET when set, otherwise OPERATOR_UI_TOKEN. */
export function requireCron(req: Request): void {
  const header = headerValue(req, "authorization");
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const cron = process.env.CRON_SECRET ?? "";
  requireToken(token, cron ? "CRON_SECRET" : "OPERATOR_UI_TOKEN");
}

export function requireAwardKey(req: Request): void {
  requireToken(headerValue(req, "x-award-api-key"), "AWARD_API_KEY");
}

export function requireComplianceKey(req: Request): void {
  requireToken(headerValue(req, "x-compliance-api-key"), "COMPLIANCE_API_KEY");
}

export { safeEqual };
