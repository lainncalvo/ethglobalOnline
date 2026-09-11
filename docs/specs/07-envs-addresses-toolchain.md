# Spec 07 — Environment, addresses and toolchain (bootstrap)

Lane: L0 · Status: doing · Owner: Laín / agent
Read first: `PLAN.md`. This lane runs first and unblocks every other lane.

## 1. Goal

From this folder (docs only, not yet pushed) to a pushed repository with npm workspaces, Foundry, the CRE CLI, a Next.js app scaffold, the Issuer portal account plus six funded EOAs, and a committed `addresses.json` that other lanes append to. L0 must leave `packages/contracts` and `apps/web` ready so L2/L3 and L5/L6 do not fight over `foundry.toml` or `package.json`.

## 2. This machine (verified 2026-09-11)

| Tool | State |
|---|---|
| Node 25.6, npm 11.8 | present |
| bun 1.3.14 | present |
| gh 2.92 | present, logged in as `lainncalvo` |
| git 2.39 | present |
| Foundry (`forge`, `cast`, `anvil`) | missing |
| CRE CLI (`cre`) | missing |
| docker, go, pnpm, yarn | missing (not needed) |

Repo `lainncalvo/ethglobalOnline`: public, one commit, `LICENSE` + 17-byte `README.md`, collaborator `AxelGes`.

## 3. Steps

1. **Confirm logistics.** Open `https://ethglobal.com/events/ethonline2026/info/details`: submission deadline Sunday 2026-09-13 12:00 pm EDT (13:00 ART). Confirm both hackers are on the same team in the dashboard.
2. **Git.**
   ```
   cd /Users/laincalvo/Documents/Hackathons/hedera-ats-market
   git init -b main
   git remote add origin https://github.com/lainncalvo/ethglobalOnline.git
   git fetch origin
   git merge origin/main --allow-unrelated-histories      # keeps LICENSE; our README.md replaces theirs
   git status --ignored                                     # CONTEXT.md and CLAUDE.md must appear under "Ignored files"
   git add -A && git commit -m "docs: plan and specs"
   git push -u origin main
   ```
   If `git status --ignored` does not list `CONTEXT.md` and `CLAUDE.md`, stop and fix `.gitignore` before the first commit.
3. **Workspaces.** Root `package.json` with `"workspaces": ["apps/*", "packages/*"]`, `"private": true`, scripts `build` (runs `npm run build --workspaces --if-present`), `test`. `.nvmrc` containing `22` (escape hatch only; Node 25 is the default). `.env.example` at root and inside each package listing the variables in §7 with empty values.
4. **Foundry.**
   ```
   curl -L https://foundry.paradigm.xyz | bash && foundryup
   forge --version && cast --version
   mkdir -p packages/contracts && cd packages/contracts && forge init --no-git --force
   forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
   ```
   `foundry.toml`:
   ```
   [profile.default]
   src = "src"; out = "out"; libs = ["lib"]
   solc = "0.8.26"
   evm_version = "paris"
   optimizer = true; optimizer_runs = 200
   [rpc_endpoints]
   hedera = "${HEDERA_RPC_URL}"
   arc = "${ARC_RPC_URL}"
   ```
   Copy `ReceiverTemplate.sol` (and its `IReceiver` interface) from `smartcontractkit/cre-templates` into `src/cre/`, keeping the original license header.
   Leave `src/hedera/` and `src/arc/` as empty directories with `.gitkeep` so L2 and L3 do not create the tree themselves.
5. **CRE CLI.**
   ```
   curl -sSL https://app.chain.link/cre/install.sh | bash
   cre version            # must be ≥ 1.29.0
   cre login
   mkdir -p packages/cre-award && cd packages/cre-award && cre init   # or clone hello-confidential-workflows
   bun install
   ```
   If `cre init` asks for a language, pick TypeScript. Do not run any deploy command.
6. **Next.js scaffold (required before L5/L6).** This step is L0, not L6.
   ```
   cd apps && npx create-next-app@15 web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
   cd web && npm install wagmi viem @tanstack/react-query
   ```
   Wire `packages/shared` as a workspace dependency. Add empty route folders `app/sell`, `app/auction/[ref]`, `app/operator` with placeholder pages. Do not implement bid/sell logic here.
7. **Wallets.** Seven actors: Issuer is an **ECDSA** testnet account from `https://portal.hedera.com` (not generated here). Generate six EOAs with `cast wallet new` (Seller, Buyer A, Buyer B, Buyer C, Operator, CRE signer). Private keys go only into `.env` files (never into `addresses.json`, never committed). Public addresses go into `PLAN.md` §9 and `addresses.json` → `demoWallets`.
   - Hedera: import the Issuer key into MetaMask, then send ~20 HBAR from it to each of the six addresses. On Hedera an address must have received HBAR (creating the account/alias) before it can hold tokens or be whitelisted in ATS.
   - Arc: `https://faucet.circle.com` → "Arc Testnet" for Buyer A, Buyer B, Operator and CRE signer. Native USDC pays gas; the ERC-20 interface at `0x3600000000000000000000000000000000000000` reports the same balance (6 decimals). Faucet is rate-limited per address per day; request early.
8. **Addresses file** `packages/shared/src/addresses.json` (committed, append-only, one commit per change):
   ```json
   {
     "hedera-testnet": {
       "chainId": 296,
       "exitAuction": "",
       "bondToken": "",
       "atsFactory": "0xd1F118A40f3b02883D35909eF2517e7EDd78379d",
       "atsResolver": "0xBA2D5FC2083A0b8f164c50e65d782087fBA18E0a"
     },
     "arc-testnet": {
       "chainId": 5042002,
       "bidEscrow": "",
       "usdc": "0x3600000000000000000000000000000000000000",
       "forwarder": ""
     },
     "demoWallets": {
       "issuer": "",
       "seller": "",
       "buyerA": "",
       "buyerB": "",
       "buyerC": "",
       "operator": "",
       "creSigner": ""
     }
   }
   ```
   Shared-package ownership after this skeleton: L0 owns `packages/shared/package.json`. L4 owns `award.ts`. L5 owns `ref.ts`, `commitment.ts`, `chains.ts`, `errors.ts`, and `src/abi/*`. `addresses.json` is append-only in its own commits.
9. **Env tables** — see §7 below; create each `.env.example`.
10. **Network reference** — see §6.
11. **Git conventions** — see §8.
12. **Repo layout** — see §9; create empty directories with a `.gitkeep` where a lane will write.

## 4. Acceptance criteria

- `forge --version`, `cast --version`, `cre version` (≥ 1.29), `bun --version` all print.
- `npm install` at root succeeds; `apps/web` exists as a Next.js 15 app with wagmi/viem; `packages/contracts` has `foundry.toml` and empty `src/hedera` + `src/arc`.
- `git log --oneline` on `origin/main` shows at least 3 commits from this team.
- Issuer (portal ECDSA) + six EOAs recorded; all six have HBAR on Hedera testnet; Buyer A, Buyer B, Operator, CRE signer have USDC on Arc testnet (check on HashScan and ArcScan).
- `packages/shared/src/addresses.json` committed with the ATS factory/resolver, USDC, and `demoWallets` keys filled (addresses only).
- `git status --ignored` lists `CONTEXT.md` and `CLAUDE.md` as ignored; neither appears in any commit (`git log --all -- CONTEXT.md CLAUDE.md` is empty).

## 5. Minimum viable / Full

| MV | Full |
|---|---|
| Steps 1–12 | `scripts/ats/cast-checks.sh` helper wrappers; a root `Makefile` with `deploy-hedera`, `deploy-arc`, `verify-*` targets |

## 6. Network reference

| | Hedera testnet | Arc testnet |
|---|---|---|
| Chain id | 296 | 5042002 |
| RPC | `https://testnet.hashio.io/api` | `https://rpc.testnet.arc.io` |
| Mirror / indexer | `https://testnet.mirrornode.hedera.com/api/v1` | — |
| Explorer | `https://hashscan.io/testnet` | `https://testnet.arcscan.app` |
| Faucet | `https://portal.hedera.com` (ECDSA account) | `https://faucet.circle.com` |
| Gas token | HBAR (18 dec in EVM, 8 on ledger) | USDC (18 dec native; ERC-20 at `0x3600…` is 6 dec) |
| Fee rule | explicit gas limits; long timeouts | `maxFeePerGas ≥ 30 gwei` on every tx (20 gwei floor) |
| Verification | Sourcify: `--verifier sourcify --verifier-url https://server-verify.hashscan.io` (fallback `https://sourcify.dev/server`) | Blockscout: `--verifier blockscout --verifier-url https://testnet.arcscan.app/api/` |
| Tx cap | 15M gas | 30M gas/block |

## 7. Environment variables

`packages/contracts/.env`

| Variable | Value / note |
|---|---|
| `HEDERA_RPC_URL` | `https://testnet.hashio.io/api` |
| `ARC_RPC_URL` | `https://rpc.testnet.arc.io` |
| `DEPLOYER_PRIVATE_KEY` | Operator key (deployer = owner) |
| `OPERATOR_ADDRESS` | Operator public address |
| `ARC_USDC_ADDRESS` | `0x3600000000000000000000000000000000000000` |
| `CRE_FORWARDER_ADDRESS` | one of the two candidates; corrected after the first broadcast (spec 03 §7 step 8) |
| `ATS_BOND_ADDRESS` | from lane L1 |

`apps/web/.env.local`

| Variable | Value / note |
|---|---|
| `NEXT_PUBLIC_HEDERA_RPC_URL`, `NEXT_PUBLIC_ARC_RPC_URL`, `NEXT_PUBLIC_HEDERA_MIRROR_URL` | as in §6 |
| `NEXT_PUBLIC_EXIT_AUCTION_ADDRESS`, `NEXT_PUBLIC_BID_ESCROW_ADDRESS`, `NEXT_PUBLIC_BOND_TOKEN_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS` | mirror `addresses.json` |
| `OPERATOR_PRIVATE_KEY` | server only |
| `OPERATOR_UI_TOKEN` | `openssl rand -hex 32` |
| `AWARD_API_KEY`, `COMPLIANCE_API_KEY` | `openssl rand -hex 32` each; same values in `packages/cre-award/.env` |
| `AWARD_MODE` | `cre` or `local` |
| `CRE_TRIGGER_URL` | `http://127.0.0.1:2000` |
| `MOCK_SANCTIONS_LIST` | comma-separated addresses, empty by default |
| `DATA_DIR` | `./data` |

`packages/cre-award/.env`

| Variable | Value / note |
|---|---|
| `CRE_ETH_PRIVATE_KEY` | CRE signer key, funded on Arc |
| `AWARD_API_KEY`, `COMPLIANCE_API_KEY` | must equal the web values |

Demo wallet keys (`SELLER_PRIVATE_KEY`, `BUYER_A_PRIVATE_KEY`, `BUYER_B_PRIVATE_KEY`, `BUYER_C_PRIVATE_KEY`) live in `scripts/.env` for the seed script only.

## 8. Git conventions

| Rule | Detail |
|---|---|
| Trunk | `main`; short-lived `lane/lN-name` branches; fast-forward or `--no-ff` merge; no review gate |
| Cadence | commit at least every 45 minutes while working; push at least hourly |
| Messages | `feat(l3): …`, `fix(l5): …`, `docs: …`, `chore: …`, `test(l2): …` |
| Agents | add `Co-Authored-By: <agent name> <noreply@anthropic.com>` when an agent wrote the change |
| Never commit | `.env`, `.env.*` (except `.env.example`), `CONTEXT.md`, `CLAUDE.md`, `apps/web/data/`, `out/`, `cache/`, `broadcast/*/dry-run/` |
| Shared files | `packages/shared/src/addresses.json` and `packages/shared/src/abi/*` are append-only in their own commits |

## 9. Repo layout

```
ethglobalOnline/
├── package.json  .nvmrc  .gitignore  .env.example  PLAN.md  README.md  LICENSE
├── apps/web/                Next.js: pages + app/api route handlers + operator UI + data/db.json (ignored)
├── packages/contracts/      Foundry: src/hedera/ExitAuction.sol, src/arc/BidEscrow.sol, src/cre/ReceiverTemplate.sol,
│                            src/interfaces/IATSBond.sol, test/, script/DeployHedera.s.sol, script/DeployArc.s.sol
├── packages/shared/         TS: abi/*.json, addresses.json, ref.ts, commitment.ts, award.ts, chains.ts, errors.ts
├── packages/cre-award/      CRE project (bun): project.yaml, secrets.yaml, award-workflow/{main.ts, workflow.yaml, config.staging.json}
├── scripts/                 ops/register.ts, ops/close.ts, ops/settle.ts, demo/seed.ts, ats/cast-checks.sh
└── docs/                    specs/, runbooks/, evidence/, architecture.md (+png), decisions.md, AI_DISCLOSURE.md, MAINNET.md, DEMO.md
```

## 10. Out of scope

CI pipelines, Docker, Hardhat, a monorepo build tool (turbo/nx), Vercel deployment (the demo runs locally), mainnet keys.

## 11. Known pitfalls

| Pitfall | Mitigation |
|---|---|
| Hardhat on Node 25 prints unsupported-version warnings and may break plugins | Foundry chosen; Node 22 via `fnm` only if a Node tool misbehaves |
| Forgetting the ignored-files check leaks internal notes to a public repo | `git status --ignored` before the first commit; `git log --all -- CONTEXT.md CLAUDE.md` must stay empty |
| Circle faucet rate limit | Request for all four Arc wallets at the start of L0; note the time |
| Hedera accounts must be ECDSA for MetaMask and ATS | Portal account type ECDSA; demo wallets created by `cast wallet new` are ECDSA; fund each with HBAR before use |
| `forge init` refuses a non-empty directory | `--force`; or init in a temp dir and move files |
| CRE CLI install script needs a login shell restart | `source ~/.zshrc` or open a new terminal before `cre version` |

## 12. Evidence

| Artifact | Path | Captured by | Date |
|---|---|---|---|
| Tool versions transcript | `docs/evidence/toolchain.log` | | |
| Wallet funding links (HashScan/ArcScan) | `docs/evidence/wallets.md` | | |
| `git status --ignored` output | `docs/evidence/ignored-check.log` | | |
