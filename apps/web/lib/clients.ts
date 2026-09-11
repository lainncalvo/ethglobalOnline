// server-only — L5 backend. Do not import from client components.
import {
  createPublicClient,
  createWalletClient,
  http,
  parseGwei,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  arcTestnet as arcDef,
  hederaTestnet as hederaDef,
} from "../../../packages/shared/src/chains";
import { ApiError, ErrorCode } from "./errors";
import { loadConfig } from "./server-config";

export const ARC_TX_FEES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("1"),
} as const;

export const HEDERA_GAS = {
  settle: 2_500_000n,
  cancel: 1_000_000n,
  createAuction: 2_000_000n,
  createHold: 3_000_000n,
} as const;

class SerialQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

const hederaQueue = new SerialQueue();
const arcQueue = new SerialQueue();

function withRpc(chain: Chain, url: string): Chain {
  return {
    ...chain,
    rpcUrls: { default: { http: [url] } },
  };
}

export function hederaChain(): Chain {
  return withRpc(hederaDef, loadConfig().hederaRpc);
}

export function arcChain(): Chain {
  return withRpc(arcDef, loadConfig().arcRpc);
}

function normalizeKey(key: string): Hex {
  const trimmed = key.trim();
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
}

export function operatorAccount(): Account {
  const key = process.env.OPERATOR_PRIVATE_KEY;
  if (!key) {
    throw new ApiError(500, ErrorCode.CONFIG, "operator key is not set");
  }
  return privateKeyToAccount(normalizeKey(key));
}

export function accountFromKey(key: string): Account {
  return privateKeyToAccount(normalizeKey(key));
}

export function hederaPublic(): PublicClient {
  const cfg = loadConfig();
  return createPublicClient({
    chain: hederaChain(),
    transport: http(cfg.hederaRpc, { timeout: 120_000, retryCount: 2 }),
    pollingInterval: 2_000,
  });
}

export function arcPublic(): PublicClient {
  const cfg = loadConfig();
  return createPublicClient({
    chain: arcChain(),
    transport: http(cfg.arcRpc, { timeout: 30_000 }),
  });
}

export function hederaWallet(account: Account = operatorAccount()): WalletClient {
  const cfg = loadConfig();
  return createWalletClient({
    account,
    chain: hederaChain(),
    transport: http(cfg.hederaRpc, { timeout: 120_000, retryCount: 2 }),
    pollingInterval: 2_000,
  });
}

export function arcWallet(account: Account = operatorAccount()): WalletClient {
  const cfg = loadConfig();
  return createWalletClient({
    account,
    chain: arcChain(),
    transport: http(cfg.arcRpc, { timeout: 30_000 }),
  });
}

export function onHedera<T>(fn: () => Promise<T>): Promise<T> {
  return hederaQueue.enqueue(fn);
}

export function onArc<T>(fn: () => Promise<T>): Promise<T> {
  return arcQueue.enqueue(fn);
}

export async function waitHedera(hash: Hex): Promise<TransactionReceipt> {
  return hederaPublic().waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 180_000,
    pollingInterval: 2_000,
  });
}

export async function waitArc(hash: Hex): Promise<TransactionReceipt> {
  return arcPublic().waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 120_000,
  });
}
