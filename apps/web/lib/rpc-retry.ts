export function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const extra =
      error.cause !== undefined ? ` ${errorText(error.cause)}` : "";
    return `${error.message}${extra}`;
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    return [record.shortMessage, record.message, record.details, errorText(record.cause)]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(" ");
  }
  return String(error);
}

export function isRpcThrottled(error: unknown): boolean {
  const text = errorText(error);
  return /rate limit/i.test(text) || /exceeds defined limit/i.test(text) || /too many requests/i.test(text);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRpcRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, waitMs: number) => void,
  attempts = 4,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isRpcThrottled(error) || attempt === attempts - 1) throw error;
      const waitMs = 8_000 * (attempt + 1);
      onRetry?.(attempt + 1, waitMs);
      await sleep(waitMs);
    }
  }
  throw last;
}
