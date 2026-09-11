// server-only — L5 backend. Do not import from client components.
import { ApiError, ErrorCode } from "./errors";

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, ErrorCode.INVALID_BODY, "invalid JSON body");
  }
}

export async function handle(
  fn: () => Promise<unknown>,
  status = 200,
): Promise<Response> {
  const { toErrorResponse } = await import("./errors");
  try {
    const body = await fn();
    return Response.json(body, { status });
  } catch (err) {
    return toErrorResponse(err);
  }
}
