import { postJson } from "./api";

export function registerHederaRail(ref: string) {
  return postJson<{ ref: string; hederaTxHash?: string; alreadyRegistered?: boolean }>(
    `/api/auctions/${ref}/hedera/register`,
    {},
  );
}

export function closeHederaRail(ref: string, token: string) {
  return postJson<Record<string, unknown>>(`/api/auctions/${ref}/hedera/close`, {}, token);
}

export function settleHederaRail(ref: string, token: string) {
  return postJson<Record<string, unknown>>(`/api/auctions/${ref}/hedera/settle`, {}, token);
}

export function cancelHederaRail(ref: string, token: string) {
  return postJson<Record<string, unknown>>(`/api/auctions/${ref}/hedera/cancel`, {}, token);
}
