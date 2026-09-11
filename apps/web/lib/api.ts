import { isSampleRef, MOCK_AUCTION, MOCK_DETAIL, MOCK_HEALTH, mockCompliance } from "./mock";
import type {
  AuctionDetail,
  AuctionView,
  ComplianceStatus,
  HealthResponse,
} from "./types";
import { ApiRequestError, type ApiErrorBody } from "./types";

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T | ApiErrorBody;
  if (!res.ok) {
    const err = body as ApiErrorBody;
    throw new ApiRequestError(
      err.error?.code ?? "HTTP_ERROR",
      err.error?.message ?? res.statusText,
      res.status,
    );
  }
  return body as T;
}

export async function fetchAuctions(): Promise<{ auctions: AuctionView[]; mocked: boolean }> {
  try {
    const res = await fetch("/api/auctions", { cache: "no-store" });
    const data = await readJson<{ auctions: AuctionView[] }>(res);
    return { auctions: data.auctions ?? [], mocked: false };
  } catch {
    return { auctions: [MOCK_AUCTION], mocked: true };
  }
}

export async function fetchAuction(ref: string): Promise<{ auction: AuctionDetail; mocked: boolean }> {
  try {
    const res = await fetch(`/api/auctions/${ref}`, { cache: "no-store" });
    const data = await readJson<AuctionDetail>(res);
    return { auction: data, mocked: false };
  } catch (error) {
    if (isSampleRef(ref)) return { auction: MOCK_DETAIL, mocked: true };
    if (error instanceof ApiRequestError && error.status === 404) throw error;
    if (isSampleRef(ref)) return { auction: MOCK_DETAIL, mocked: true };
    throw error instanceof ApiRequestError
      ? error
      : new ApiRequestError("OFFLINE", "Auction API is offline", 503);
  }
}

export async function fetchCompliance(address: string): Promise<ComplianceStatus> {
  try {
    const res = await fetch(`/api/compliance/status?address=${address}`, { cache: "no-store" });
    return await readJson<ComplianceStatus>(res);
  } catch {
    return mockCompliance(address);
  }
}

export async function fetchHealth(): Promise<{ health: HealthResponse; mocked: boolean }> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    return { health: await readJson<HealthResponse>(res), mocked: false };
  } catch {
    return { health: MOCK_HEALTH, mocked: true };
  }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  return readJson<T>(res);
}

export function registerAuction(hederaAuctionId: string) {
  return postJson<{ ref: string; arcTxHash?: string; alreadyRegistered?: boolean }>(
    "/api/auctions",
    { hederaAuctionId },
  );
}

export function postReserve(ref: string, reserve: string, salt: string) {
  return postJson<{ ok: true }>(`/api/auctions/${ref}/reserve`, { reserve, salt });
}

export function closeAuction(ref: string, token: string) {
  return postJson<Record<string, unknown>>(`/api/auctions/${ref}/close`, {}, token);
}

export function settleAuction(ref: string, token: string) {
  return postJson<Record<string, unknown>>(`/api/auctions/${ref}/settle`, {}, token);
}

export function settlePreview(ref: string, to: string, token: string) {
  return postJson<{ ok: boolean; code: string; reasonText: string }>(
    `/api/auctions/${ref}/settle-preview`,
    { to },
    token,
  );
}

export function voidAuction(ref: string, reason: string, token: string) {
  return postJson<Record<string, unknown>>(`/api/auctions/${ref}/void`, { reason }, token);
}

export function cancelAuction(ref: string, token: string) {
  return postJson<Record<string, unknown>>(`/api/auctions/${ref}/cancel`, {}, token);
}
