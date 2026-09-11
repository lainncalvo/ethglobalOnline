# Spec 03 — CRE confidential award workflow

Lane: L4 · Status: todo · Owner: —
Read first: `PLAN.md`, then `docs/specs/02-bid-escrow.md` (the receiver this workflow writes to) and `docs/specs/04-backend-api.md` (the two endpoints it calls).

## 1. Goal

Build the Chainlink CRE workflow that closes an exit auction: inside a confidential TEE handler it fetches the sealed reserve price and the confidential compliance screening, computes the winner, and writes a DON-signed award report to `BidEscrow` on Arc testnet. This is the only path that produces `Awarded(source = CRE)`.

## 2. Sponsor requirement this lane satisfies

Chainlink · Best Confidential Workflow. The judging rules, restated:

| Rule | How this lane meets it |
|---|---|
| Workflow uses Confidential Workflows for a meaningful part of the application | The award decision (winner, clearing price) is computed only inside the enclave |
| Registers and uses a confidential TEE handler (`handlerInTee` in TypeScript) | `main.ts` registers exactly one handler via `handlerInTee` |
| Confidential portion processes at least one sensitive input, secret, confidential API response, private parameter or intermediate value | Three: the two API keys (secrets), the sealed reserve price (private parameter), the compliance screening response (confidential API response) |
| Meaningfully integrated into core functionality; a placeholder does not qualify | `BidEscrow._award` is reachable through `onReport` (this workflow) or `awardByOperator` (fallback, labelled `AwardSource.Operator` on-chain). The demo path is the CRE one. |
| Evidence via CRE CLI simulation or live deployment | `cre workflow simulate --broadcast` transcript + ArcScan tx hash, captured per `docs/evidence/README.md` |

Why it is load-bearing, in one sentence for the README: the enclave is the only place where the reserve price, the API keys and the screening verdicts exist in plaintext, and its report is the only thing that moves the auction from `Bidding` to `Awarded` in the demo.

## 3. Dependencies and inputs

| Input | Source | Needed by |
|---|---|---|
| `BidEscrow` address on Arc testnet | `packages/shared/src/addresses.json` (lane L3) | `config.staging.json` |
| Forwarder address used by `BidEscrow` | L3 deploy; may need `setForwarderAddress` after first broadcast | step 8 |
| `GET /api/auctions/[ref]/snapshot` and `POST /api/compliance/screen` | lane L5; mockable with a static JSON server during the spike | HTTP 1 and HTTP 2 |
| `AWARD_API_KEY`, `COMPLIANCE_API_KEY` | shared with `apps/web/.env.local` | `secrets.yaml` / `.env` |
| `CRE_ETH_PRIVATE_KEY` funded on Arc testnet (USDC pays gas) | lane L0 wallet "CRE signer" | `--broadcast` |
| `computeAward` | `packages/shared/src/award.ts` (this lane writes it, L5 reuses it) | handler |

## 4. Project layout

```
packages/cre-award/
├── project.yaml                # targets: staging-settings → rpcs [{chain-name: arc-testnet, url: https://rpc.testnet.arc.io}]
├── secrets.yaml                # secretsNames: { award_api_key: [AWARD_API_KEY], compliance_api_key: [COMPLIANCE_API_KEY] }
├── .env.example                # CRE_ETH_PRIVATE_KEY=, AWARD_API_KEY=, COMPLIANCE_API_KEY=
├── package.json                # bun; @chainlink/cre-sdk ^1.18, viem
└── award-workflow/
    ├── main.ts                 # the workflow (one handlerInTee)
    ├── workflow.yaml           # name, entry main.ts, config config.staging.json
    └── config.staging.json
```

Toolchain floors: `@chainlink/cre-sdk` ≥ 1.18.0 (first version with `handlerInTee`), CRE CLI ≥ 1.29.0 (`cre version`), bun ≥ 1.2. Arc testnet support needs SDK ≥ 1.3.1, already covered.

`config.staging.json`:
```json
{
  "backend_base_url": "http://127.0.0.1:3000",
  "bid_escrow_address": "0x0000000000000000000000000000000000000000",
  "chain_selector_name": "arc-testnet",
  "gas_limit": "600000",
  "secrets_ids": {
    "award_api_key_id": "award_api_key",
    "compliance_api_key_id": "compliance_api_key"
  }
}
```

`secrets.yaml`:
```yaml
secretsNames:
  award_api_key: [AWARD_API_KEY]
  compliance_api_key: [COMPLIANCE_API_KEY]
```

`project.yaml` (relevant part):
```yaml
staging-settings:
  rpcs:
    - chain-name: arc-testnet
      url: https://rpc.testnet.arc.io
```

## 5. Handler design (`award-workflow/main.ts`)

All SDK call shapes below are to be confirmed against the `hello-confidential-workflows` and `ai-audit-firewall` templates in `smartcontractkit/cre-templates`; adapt names if the installed SDK differs. (confirm against template)

```
imports: CronCapability?, HTTPCapability, HTTPClient, EVMClient, getNetwork, handlerInTee,
         Runner, decodeJson, hexToBase64, type TeeRuntime   from "@chainlink/cre-sdk"
         encodeAbiParameters, parseAbiParameters, keccak256 from "viem"
         computeAward, Snapshot, Screening                 from "@remate/shared/award"

type Config = { backend_base_url; bid_escrow_address; chain_selector_name; gas_limit; secrets_ids }

const initWorkflow = (config: Config) => {
  const http = new HTTPCapability()
  const trigger = http.trigger({ authorizedKeys: [] })          // simulation only; set keys before any deploy
  return [ handlerInTee(trigger, onAwardRequest, {}, { preHook: restrictions }) ]
}

onAwardRequest(runtime: TeeRuntime<Config>, payload: HTTPPayload):
  1. { ref } = decodeJson(payload.input)                        // reject if not 0x + 64 hex
  2. secrets = runtime.getSecrets([{ id: "award_api_key" }, { id: "compliance_api_key" }]).result()
  3. HTTP 1  GET  {backend_base_url}/api/auctions/{ref}/snapshot
             headers: x-award-api-key: secrets.award_api_key.value
             → Snapshot (see §6)
  4. HTTP 2  POST {backend_base_url}/api/compliance/screen
             headers: x-compliance-api-key: secrets.compliance_api_key.value, content-type: application/json
             body: { token, seller, partition, amount, candidates: snapshot.bids.map(b => b.bidder) }
             → Screening (see §6)
  5. award = computeAward(snapshot, screening)                  // throws on commitment mismatch
     runtime.log(`ref=${ref} outcome=${award.outcome} commitment=${award.reserveCommitment} eligible=${award.eligible} winner=${award.winner}`)
  6. payloadHex = encodeAbiParameters(
       parseAbiParameters('bytes32 ref, address winner, uint256 clearingPrice, bytes32 reserveCommitment, uint8 outcome, bytes32 bidsDigest'),
       [ref, award.winner, award.clearingPrice, award.reserveCommitment, award.outcome, award.bidsDigest])
  7. don = runtime.usingTheDons()                               // one-way door: nothing after this is confidential
     report = don.report({ encodedPayload: hexToBase64(payloadHex), encoderName: "evm",
                           signingAlgo: "ecdsa", hashingAlgo: "keccak256" }).result()
  8. selector = getNetwork({ chainFamily: "evm", chainSelectorName: config.chain_selector_name, isTestnet: true }).chainSelector.selector
     tx = new EVMClient(selector).writeReport(don, { receiver: config.bid_escrow_address, report,
                                                    gasConfig: { gasLimit: config.gas_limit } }).result()
  9. return { ref, outcome: award.outcome, winner: award.winner, clearingPrice: award.clearingPrice.toString(), txHash: tx.txHash }

restrictions (preHook):
  limitSendRequest(3)        // we use 2; head-room for one retry
  report: maxCalls 1
  limitWriteReport(1)
  maxSecrets 2
```

HTTP client usage inside the enclave: use the plain `HTTPClient` and pass the `TeeRuntime`; `sendRequest(runtime, { url, method, headers, body })` where `body` is base64 of the JSON (confirm against template). Do not use `ConfidentialHTTPClient` here; it has no `TeeRuntime` overload and is a different product.

### Rules inside the enclave

| Rule | Reason |
|---|---|
| At most 5 HTTP calls per execution; we make 2 | Service quota |
| No chain reads or writes inside the handler body before `usingTheDons()` | Chain capabilities run on DON nodes, never in the enclave; they will not compile/execute inside |
| Deterministic logic only (no randomness, no wall-clock branching) | Attested result must be reproducible |
| Never log the reserve value, the salt, secrets, or per-bidder screening verdicts | Simulator logs are shown on screen and will be in the video |
| Log only: `ref`, `outcome`, `reserveCommitment`, `eligible` count, `winner` | Enough for evidence, nothing sensitive |
| Everything passed into a capability after `usingTheDons()` is public | The report payload is deliberately non-sensitive (winner, price, commitment, digest) |

### Report payload

`abi.encode(bytes32 ref, address winner, uint256 clearingPrice, bytes32 reserveCommitment, uint8 outcome, bytes32 bidsDigest)` — 192 bytes, decoded by `BidEscrow._processReport` exactly in this order.

| outcome | Meaning | `winner` | `clearingPrice` |
|---|---|---|---|
| 1 | AWARDED | winning bidder | winner's bid amount |
| 2 | NO_COMPLIANT_BID | `0x0` | 0 |
| 3 | ALL_BELOW_RESERVE | `0x0` | 0 |
| 4 | NO_BIDS | `0x0` | 0 |

## 6. Award engine (`packages/shared/src/award.ts`)

Shared by this workflow and by the backend's local fallback (`AWARD_MODE=local`). Pure TypeScript, no I/O, viem only.

Types:
```
Snapshot = {
  ref: Hex; deadline: number; seller: Address; reserveCommitment: Hex;
  bids: { bidder: Address; amount: string }[];            // insertion order as returned by BidEscrow.getBids
  reserve: { value: string; salt: Hex };                  // sealed; only the TEE and the backend see this
  hedera: { token: Address; partition: Hex; amount: string; seller: Address; auctionId: string };
}
Screening = { address: Address; whitelisted: boolean; kyc: "GRANTED" | "NOT_GRANTED";
              sanctions: "CLEAR" | "HIT"; canTransfer: boolean; code: Hex; reason: string }[]
Award = { outcome: 1 | 2 | 3 | 4; winner: Address; clearingPrice: bigint;
          reserveCommitment: Hex; bidsDigest: Hex; eligible: number }
```

Algorithm `computeAward(snapshot, screening): Award`:
1. `commitment = keccak256(encodeAbiParameters([uint256, bytes32], [BigInt(reserve.value), reserve.salt]))`; if `commitment !== snapshot.reserveCommitment` throw `CommitmentMismatch` (the TEE refuses to award on a tampered reserve).
2. `eligible = bids.filter(b => s(b.bidder).whitelisted && s.kyc === "GRANTED" && s.sanctions === "CLEAR" && s.canTransfer)`; a bidder missing from `screening` is ineligible.
3. Sort eligible descending by `amount`; ties keep the earlier snapshot index. `winner = first with amount >= reserve.value`; `clearingPrice = winner.amount` (first-price).
4. Outcomes: `bids.length === 0` → 4; `eligible.length === 0` → 2; no eligible bid ≥ reserve → 3; else 1.
5. `bidsDigest = keccak256(concat(bids.map(b => encodePacked([address, uint256], [b.bidder, BigInt(b.amount)]))))` over the snapshot order (empty bids → `keccak256("0x")`).
6. Return `{ outcome, winner (0x0 when not 1), clearingPrice (0n when not 1), reserveCommitment: commitment, bidsDigest, eligible: eligible.length }`.

Unit tests (`packages/shared/test/award.test.ts`, bun test):

| # | Case | Expected |
|---|---|---|
| 1 | Two eligible bids above reserve | outcome 1, higher bid wins, clearingPrice = its amount |
| 2 | Tie on amount | earlier bidder wins |
| 3 | Highest bid from a non-KYC bidder | outcome 1, second bidder wins |
| 4 | Highest bidder sanctions HIT | outcome 1, other bidder wins |
| 5 | All bidders ineligible | outcome 2, winner 0x0 |
| 6 | All eligible bids below reserve | outcome 3 |
| 7 | No bids | outcome 4, bidsDigest = keccak256("0x") |
| 8 | Commitment mismatch (wrong salt) | throws |
| 9 | Bidder absent from screening | treated ineligible |
| 10 | Digest stability | same bids in same order → same digest; reordered → different |

## 7. Steps (in order)

1. **Spike (60–90 min, before touching our logic):** install CRE CLI, `cre login`, run the unmodified `hello-confidential-workflows` template with `cre workflow simulate`. Confirm the TEE banner prints and `getSecret` + in-enclave HTTP work. Record the exact SDK function names used by the template.
2. Create `packages/cre-award` from that template; add `config.staging.json`, `secrets.yaml`, `.env` (from `.env.example`); `bun install`.
3. Write `packages/shared/src/award.ts` + tests; `bun test` green.
4. Write `main.ts` per §5 with the HTTP trigger; run `cre workflow simulate ./award-workflow --target staging-settings --http-payload '{"ref":"0x…"}'` against a stub backend (a static JSON file served locally is enough) — no chain write yet (leave `bid_escrow_address` as zero and comment out step 8, or use `--broadcast` absent).
5. Point `backend_base_url` at the real backend (lane L5) once `/snapshot` and `/screen` exist.
6. Fill `bid_escrow_address` from `addresses.json`; fund `CRE_ETH_PRIVATE_KEY` on Arc testnet (faucet.circle.com).
7. Run `cre workflow simulate ./award-workflow --target staging-settings --broadcast --listen`, then in another shell:
   `curl -X POST http://localhost:2000 -H 'content-type: application/json' -d '{"ref":"0x…"}'`.
8. **Forwarder check:** if the write lands but `onReport` reverts, read the `from` of the tx on ArcScan and have the `BidEscrow` owner call `setForwarderAddress(<that address>)`. Candidates published for Arc testnet: `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` and `0x76c9cf548b4179F8901cda1f8623568b58215E62` (sources disagree on which is production vs. simulation; the tx `from` is the truth).
9. Capture evidence for both branches (award and no-winner) per `docs/evidence/README.md`. Keep the "simulator is not a real TEE" banner in the transcript; the video says "simulated enclave, attested in production".
10. Commit `EVIDENCE` files, `.env.example` (never `.env`), `secrets.yaml` (names only).

Commands reference:
```
cre login
cre version                                    # ≥ 1.29.0
cre workflow simulate ./award-workflow --target staging-settings --http-payload '{"ref":"0x…"}'
cre workflow simulate ./award-workflow --target staging-settings --broadcast --listen
curl -X POST http://localhost:2000 -H 'content-type: application/json' -d '{"ref":"0x…"}'
cre workflow simulate ./award-workflow --target staging-settings --engine-logs --verbose   # debugging only
```

## 8. Acceptance criteria

- `Awarded(ref, winner, clearingPrice, reserveCommitment, source = CRE, bidsDigest)` visible on `testnet.arcscan.app` for a real auction, produced by a simulated run with `--broadcast`.
- A simulate transcript that shows the TEE banner, the secrets fetch, both HTTP calls, the one-line award log, the report, and the tx hash.
- A second transcript for a no-winner branch (`NoWinner` event on ArcScan, outcome 2 or 3).
- Negative control: `grep -i` for the reserve value and both API key values over all transcripts returns nothing.
- `bun test` for `computeAward` green (10 cases).

## 9. Minimum viable / Full

| MV (must) | Full (only after gate G3) |
|---|---|
| HTTP trigger, one `handlerInTee`, 2 HTTP calls, EVM write to Arc | Cron trigger variant that scans for auctions past deadline |
| `bidsDigest` emitted in the report | `BidEscrow` verifies `bidsDigest` on-chain (needs L3 Full) |
| Simulation evidence | Live deployment attempt if private-beta access is granted (`cre workflow deploy`, Vault DON secrets) |

## 10. Out of scope

Live deployment on the CRE network (private beta); decrypting bids in the enclave (bids are public on Arc); reading Hedera from inside the enclave; writing to Hedera from CRE (unsupported chain); sealed bids; on-chain verification that the enclave ran (mock forwarder on testnet accepts unsigned reports — documented in the threat model).

## 11. Known pitfalls

| Pitfall | Mitigation |
|---|---|
| Confidential Workflows private beta; form linked from the prize page | Submit the form once for optics; plan around simulation only |
| SDK floors: `handlerInTee` needs SDK ≥ 1.18 and CLI ≥ 1.29 | `cre update`; pin `@chainlink/cre-sdk` in package.json |
| `ConfidentialHTTPClient` is a different feature and does not satisfy the bounty; it will not type-check with `TeeRuntime` | Use plain `HTTPClient` inside `handlerInTee` |
| Chain reads/writes inside the enclave do not exist | Everything on-chain goes through the backend or after `usingTheDons()` |
| Workflow execution timeout 5 min, single capability call 3 min | Backend endpoints must answer in seconds; no polling inside |
| Logs leak: anything logged in the handler shows in the simulator and would leave a real enclave | Log the five allowed fields only |
| HTTP trigger with `authorizedKeys: []` is only valid in simulation | Never deploy with an empty list |
| Wrong forwarder in `BidEscrow` → `onReport` reverts | Owner-only `setForwarderAddress`; read the tx `from` |
| `--listen` re-fires create duplicate reports | `BidEscrow._award` requires status `Bidding`; replays revert harmlessly |
| Gas: `writeReport` gas limit too low on Arc | `gas_limit` 600000 in config; raise if ArcScan shows out-of-gas |

## 12. Evidence

| Artifact | Path | Captured by | Date |
|---|---|---|---|
| Simulate transcript, AWARDED branch | `docs/evidence/cre-simulate-<ref>-award.log` | skipped: `cre workflow simulate` requires `cre login` (CLI v1.33.0); local `cre-compile` of `award-workflow/main.ts` succeeded | 2026-09-11 |
| Simulate transcript, NO_WINNER branch | `docs/evidence/cre-simulate-<ref>-nowinner.log` | skipped: same login gate | 2026-09-11 |
| ArcScan tx `Awarded(source=CRE)` | `docs/evidence/README.md` links table | not yet — needs `--broadcast` + L3 `BidEscrow` | |
| Screenshot of the TEE banner | `docs/evidence/cre-tee-banner.png` | not captured | |
| Negative-control grep output | `docs/evidence/cre-noleak.txt` | not captured | |
