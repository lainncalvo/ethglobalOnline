// server-only — L5 backend. Do not import from client components.
import { ErrorCode, apiErrorBody, type ErrorCodeName } from "../../../packages/shared/src/errors";

const SENSITIVE =
  /\b(reserve|salt|verdict|screening|api[_-]?key|award_api_key|compliance_api_key|operator_ui_token|private_key)\b/i;

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCodeName | string;

  constructor(status: number, code: ErrorCodeName | string, message: string) {
    super(redactText(message));
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function redactText(value: string): string {
  if (!SENSITIVE.test(value)) return value;
  return value.replace(SENSITIVE, "[redacted]");
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(apiErrorBody(err.code, err.message), {
      status: err.status,
    });
  }
  const message =
    err instanceof Error ? redactText(err.message) : "internal error";
  return Response.json(apiErrorBody(ErrorCode.UNKNOWN, message), {
    status: 500,
  });
}

export { ErrorCode, apiErrorBody };
