import {
  bytesToBase64,
  bytesToHex,
  decodeJson,
  EVMClient,
  EVMRestrictor,
  getNetwork,
  handlerInTee,
  hexToBase64,
  HTTPCapability,
  HTTPClient,
  HTTPClientRestrictor,
  json,
  ok,
  Runner,
  TxStatus,
  type HTTPPayload,
  type TeeRuntime,
} from "@chainlink/cre-sdk";
import type { SDK_PB } from "@chainlink/cre-sdk/pb";
import { encodeAbiParameters, parseAbiParameters, zeroAddress } from "viem";
import { z } from "zod";
import {
  computeAward,
  type Screening,
  type Snapshot,
} from "../../shared/src/award";

const REF_RE = /^0x[0-9a-fA-F]{64}$/;

const REPORT_ABI =
  "bytes32 ref, address winner, uint256 clearingPrice, bytes32 reserveCommitment, uint8 outcome, bytes32 bidsDigest";

export const configSchema = z.object({
  backend_base_url: z.string(),
  bid_escrow_address: z.string(),
  chain_selector_name: z.string(),
  gas_limit: z.string(),
  secrets_ids: z.object({
    award_api_key_id: z.string(),
    compliance_api_key_id: z.string(),
  }),
});

export type Config = z.infer<typeof configSchema>;

function jsonBody(value: unknown): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(value)));
}

function parseRef(payload: HTTPPayload): `0x${string}` {
  if (!payload.input || payload.input.length === 0) {
    throw new Error("empty HTTP payload");
  }
  const input = decodeJson(payload.input) as { ref?: unknown };
  if (typeof input.ref !== "string" || !REF_RE.test(input.ref)) {
    throw new Error("ref must be 0x + 64 hex chars");
  }
  return input.ref as `0x${string}`;
}

function fetchJson<T>(
  runtime: TeeRuntime<Config>,
  request: { url: string; method: string; headers: Record<string, string>; body?: string },
): T {
  const multiHeaders: Record<string, { values: string[] }> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    multiHeaders[name] = { values: [value] };
  }
  const response = new HTTPClient()
    .sendRequest(runtime, {
      url: request.url,
      method: request.method,
      multiHeaders,
      ...(request.body !== undefined ? { body: request.body } : {}),
    })
    .result();
  if (!ok(response)) {
    throw new Error(`HTTP ${request.method} ${request.url} failed: ${response.statusCode}`);
  }
  return json(response) as T;
}

function encodeAwardReport(
  ref: `0x${string}`,
  award: ReturnType<typeof computeAward>,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters(REPORT_ABI), [
    ref,
    award.winner,
    award.clearingPrice,
    award.reserveCommitment,
    award.outcome,
    award.bidsDigest,
  ]);
}

/** Caps HTTP, write, and secret fetches. We use 2 HTTP + 1 report + 1 write. */
function restrictions(config: Config): SDK_PB.RestrictionsJson {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chain_selector_name,
    isTestnet: true,
  });
  const writeLimit = network
    ? [new EVMRestrictor(network.chainSelector.selector).limitWriteReport(1)]
    : [];
  return {
    secrets: { maxSecrets: 2 },
    capabilities: {
      maxTotalCalls: 6,
      restrictions: [
        new HTTPClientRestrictor().limitSendRequest(3),
        ...writeLimit,
      ],
    },
  };
}

export function onAwardRequest(
  runtime: TeeRuntime<Config>,
  payload: HTTPPayload,
): {
  ref: string;
  outcome: number;
  winner: string;
  clearingPrice: string;
  txHash: string;
} {
  const config = runtime.config;
  const ref = parseRef(payload);

  const secrets = runtime
    .getSecrets([
      { id: config.secrets_ids.award_api_key_id },
      { id: config.secrets_ids.compliance_api_key_id },
    ])
    .result();
  const awardKey = secrets[config.secrets_ids.award_api_key_id].value;
  const complianceKey = secrets[config.secrets_ids.compliance_api_key_id].value;

  const snapshot = fetchJson<Snapshot>(runtime, {
    url: `${config.backend_base_url}/api/auctions/${ref}/snapshot`,
    method: "GET",
    headers: { "x-award-api-key": awardKey },
  });

  const screening = fetchJson<Screening>(runtime, {
    url: `${config.backend_base_url}/api/compliance/screen`,
    method: "POST",
    headers: {
      "x-compliance-api-key": complianceKey,
      "content-type": "application/json",
    },
    body: jsonBody({
      token: snapshot.hedera.token,
      seller: snapshot.hedera.seller,
      partition: snapshot.hedera.partition,
      amount: snapshot.hedera.amount,
      candidates: snapshot.bids.map((bid) => bid.bidder),
    }),
  });

  const award = computeAward(snapshot, screening);
  // Allowed fields only — never reserve, salt, keys, or per-bidder verdicts.
  runtime.log(
    `ref=${ref} outcome=${award.outcome} commitment=${award.reserveCommitment} eligible=${award.eligible} winner=${award.winner}`,
  );

  const payloadHex = encodeAwardReport(ref, award);
  const don = runtime.usingTheDons();
  const report = don
    .report({
      encodedPayload: hexToBase64(payloadHex),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  let txHash = "0x";
  const receiver = config.bid_escrow_address.toLowerCase();
  if (receiver !== zeroAddress) {
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: config.chain_selector_name,
      isTestnet: true,
    });
    if (!network) {
      throw new Error(`unknown chain: ${config.chain_selector_name}`);
    }
    const write = new EVMClient(network.chainSelector.selector)
      .writeReport(don, {
        receiver: config.bid_escrow_address,
        report,
        gasConfig: { gasLimit: config.gas_limit },
      })
      .result();
    if (write.txStatus !== TxStatus.SUCCESS) {
      throw new Error(`writeReport status ${write.txStatus}`);
    }
    txHash = bytesToHex(write.txHash ?? new Uint8Array(32));
  }

  return {
    ref,
    outcome: award.outcome,
    winner: award.winner,
    clearingPrice: award.clearingPrice.toString(),
    txHash,
  };
}

export function initWorkflow(_config: Config) {
  const http = new HTTPCapability();
  return [
    handlerInTee(
      http.trigger({ authorizedKeys: [] }),
      onAwardRequest,
      [{ tee: "nitro", regions: ["us-west-2"] }],
      { preHook: restrictions },
    ),
  ];
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

void main();
