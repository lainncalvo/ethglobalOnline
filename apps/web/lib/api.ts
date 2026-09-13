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

export async function fetchAuctions(): Promise<{ auctions: AuctionView[] }> {
  const res = await fetch("/api/auctions", { cache: "no-store" });
  const data = await readJson<{ auctions: AuctionView[] }>(res);
  return { auctions: data.auctions ?? [] };
}

export async function fetchAuction(ref: string): Promise<{ auction: AuctionDetail }> {
  const res = await fetch(`/api/auctions/${ref}`, { cache: "no-store" });
  const data = await readJson<AuctionDetail>(res);
  return { auction: data };
}

export async function fetchCompliance(address: string): Promise<ComplianceStatus> {
  const res = await fetch(`/api/compliance/status?address=${address}`, { cache: "no-store" });
  return readJson<ComplianceStatus>(res);
}

export async function fetchHealth(): Promise<{ health: HealthResponse }> {
  const res = await fetch("/api/health", { cache: "no-store" });
  return { health: await readJson<HealthResponse>(res) };
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
