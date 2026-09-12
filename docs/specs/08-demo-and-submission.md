# Spec 08 — Demo video, README, diagram, disclosure, evidence, submission

Lane: L7 · Status: todo · Owner: —
Read first: `PLAN.md`

## Goal

Everything the judges read or watch: the 2–4 minute video, the README, the architecture
diagram, the AI disclosure, the evidence folder, and the ETHGlobal submission form. This lane
starts Saturday morning in parallel with integration and ends when the form is submitted
(**target 12:00 ART Sunday; hard deadline 13:00 ART**).

Sponsor requirements satisfied: Hedera (video ≤ 5 min with issuance, configuration, one
lifecycle op; public repo; HashScan links), Arc (working frontend + backend, architecture
diagram, video + documentation, bounty stated), Chainlink (evidence of a successful
Confidential Workflow simulation), ETHGlobal (video rules, AI-tool disclosure, commit history).

## Video rules (ETHGlobal wins over sponsor wording)

| Rule | Value |
|---|---|
| Duration | **2:00–4:00**. The uploader rejects videos outside this range. Hedera's "five minutes or less" is satisfied automatically. Target **3:30 ± 20 s**. |
| Resolution | ≥ 720p; record at 1080p |
| Narration | Human voice. No AI/TTS voiceover, no music-with-captions instead of narration |
| Footage | No sped-up footage, no phone recording of a screen |
| Content | Must show the project working; state which sponsor tracks are targeted |

Spoken pitch after red-team: `docs/pitch-es.md`. What not to say: `docs/pitch-redteam.md`.

## Beat sheet (3:30)

| t | Beat | On screen (exact) | Wallet | Explorer link shown | Bounty tag | Narration (say this) |
|---|---|---|---|---|---|---|
| 0:00–0:20 | Hook | Title card with the project name and one line; then the architecture PNG for 3 s | — | — | — | "Asseto already ships an order book, RFQ and atomic DvP on Hedera. Remate is not that venue. It is a first-price exit auction on an ATS hold with no live quote: sealed reserve, USDC on Arc, award in a Chainlink confidential workflow, compliance enforced by the token. Worse than an RFQ. Useful when there is no quote." |
| 0:20–0:50 | Issuance + configuration | ATS web app: bond details page for "ON Serie I 2027"; control list screen with Seller, Buyer A, Buyer B; KYC screen; coupon screen with the 9% coupon | Issuer | HashScan token page | Hedera: issuance, configuration, coupon | "The issuer created the bond in the Studio: fixed rate, USD, maturity 2027. Three wallets are whitelisted and KYC'd. One wallet, Buyer C, is not. A coupon is configured. Nothing here is ours; this is the Studio doing its job." |
| 0:50–1:15 | Seller opens the exit auction | Our app `/sell`: amount 10, deadline, reserve price entered; MetaMask confirms hold creation, then auction creation; auction page shows the reserve commitment | Seller | HashScan tx of `createAuction`; ArcScan tx of `AuctionRegistered` | Hedera + Arc | "The seller lists ten bonds. The bonds do not leave the seller's wallet: the Studio's hold primitive locks them with our contract as escrow, and they keep earning the coupon. The reserve price is sealed; only its hash is on-chain. The auction is mirrored on Arc, where the cash lives." |
| 1:15–1:45 | Bids + blocked wallet | `/auction/[ref]`: Buyer A bids 14,500 USDC; Buyer B bids 15,200 USDC (approve + placeBid); switch to Buyer C: badge "Not eligible — KYC not granted (0x51)", bid button disabled; operator panel `settle-preview` for Buyer C shows the same code; a real `settle` attempt to Buyer C reverts | Buyer A, Buyer B, Buyer C, Operator | ArcScan `BidPlaced` ×2; HashScan reverted tx | Hedera: compliance controls; Arc: USDC escrow | "Two whitelisted investors bid in USDC on Arc. Buyer C connects and cannot bid: the app reads the token's own KYC state. And if the operator tried to deliver to Buyer C anyway, the token reverts. Compliance is enforced by the asset, not by us." |
| 1:45–2:20 | Confidential award | Terminal: `cre workflow simulate --broadcast` output: TEE banner, secrets fetched, snapshot and screening fetched, "commitment verified", outcome AWARDED; ArcScan `Awarded(source=CRE)` tx | Operator (CRE key) | ArcScan tx of `onReport` | Chainlink | "At the deadline a Chainlink CRE confidential workflow runs. Inside handlerInTee — simulated, not a hardware TEE — it fetches the sealed reserve and a compliance screen with secret keys, verifies the commitment, and computes the award. Only the winner and the price leave, as a report the DON writes to Arc. Without this workflow the escrow cannot award." |
| 2:20–2:50 | Settlement | Operator panel: `settle` → HashScan `HoldByPartitionExecuted` (10 bonds to Buyer B); `confirmDelivery` → ArcScan USDC transfer to seller; Buyer A `withdraw` → refund | Operator, Buyer A | HashScan settle tx; ArcScan `DeliveryConfirmed`, `Withdrawn` | Hedera: lifecycle transfer; Arc: multi-step settlement | "Delivery: the operator executes the hold and the Studio moves the bonds to Buyer B, running its compliance check at that instant. Then the escrow pays the seller in USDC and the losing bidder withdraws. Two chains, one auction, every step on-chain." |
| 2:50–3:10 | Lifecycle | ATS app holders view: Buyer B holds 10; coupon screen shows Buyer B entitled (or the coupon schedule) | Issuer | HashScan token page | Hedera: distribution | "Back in the Studio, Buyer B is now a holder and is entitled to the coupon. The asset's lifecycle continues untouched." |
| 3:10–3:30 | Architecture + bounties | Architecture PNG; a card listing Hedera / Arc / Chainlink components; a line "Settlement is coordinated across two chains, not atomic; the operator relays, the token enforces"; "Arc mainnet by September 30" | — | — | All | "Hedera holds the asset and its compliance. Arc holds the cash. Chainlink computes the award in a simulated confidential handler. Settlement is coordinated across the two chains rather than atomic, and we say so. This is an exit protocol for an unquoted ATS hold — not the secondary market for every tokenized bond." |

## Recording plan (Saturday 22:00–01:00 ART, after the feature freeze)

1. Run `scripts/demo/seed.ts` before each take: it creates a fresh auction with the demo
   parameters, funds the buyer wallets on Arc, and prints the ref. Record one clip per beat.
2. MetaMask accounts pre-labelled: `Issuer`, `Seller`, `Buyer A`, `Buyer B`, `Buyer C (no
   KYC)`, `Operator`. Both networks added. Hide balances that are irrelevant.
3. Browser zoom 125%, window 1920×1080, dark mode off (explorer pages read better).
4. Record with QuickTime (File → New Screen Recording) or OBS at 1080p, 30 fps. Record the
   terminal for the CRE beat with a large font (≥ 16 pt) and a light theme.
5. **No secrets on screen**: `.env` files closed; terminal history cleared; the CRE log must
   not print the reserve (it prints the commitment only). Check the checklist below before
   every clip.
6. Save clips as `docs/evidence/video/clip-0N-<beat>.mov` (not committed if > 50 MB; keep
   them local and upload the final video only).

Pre-take checklist: correct wallet selected · correct network · explorer tab open on the
right page · no private keys/API keys visible · zoom 125% · clip name ready.

## Editing (Sunday 09:00–11:00 ART)

Cut clips to the beat sheet · record narration in one pass per beat (built-in mic is fine,
quiet room) · overlay the explorer links as captions where the beat says so · export 1080p
H.264 · check duration is 3:10–3:50 · upload to YouTube (unlisted) or the ETHGlobal uploader
· test the link in an incognito window.

## README final structure

Mirror the current `README.md` sections and fill:

1. Name + one-liner + the three targeted tracks.
2. Problem (two sentences) and what is built (four bullets: ATS bond, exit auction, USDC
   escrow on Arc, confidential award on CRE).
3. Architecture PNG (`docs/architecture.png`) + link to `docs/architecture.md`.
4. Deployments table: contract · chain · address · verified link (HashScan / ArcScan) ·
   commit.
5. How to run (repo layout, env files, `forge test`, `npm run dev`, `cre workflow simulate`).
6. Demo video link + evidence folder link.
7. Bounty statements (below) and the named limitation.
8. AI disclosure link (`docs/AI_DISCLOSURE.md`), licence.

## Bounty statements (paste into the ETHGlobal form and the README)

**Hedera — Tokenization of Anything.** We built a secondary market for bonds issued with the
Asset Tokenization Studio. The bond "ON Serie I 2027" was issued and configured in the ATS
web app on Hedera testnet (whitelist control list, internal KYC, one coupon). Our
`ExitAuction` contract (verified on HashScan, link in the README) settles trades through the
Studio's hold primitive: the seller's bonds stay in their wallet under a hold with our
contract as escrow, and delivery calls `executeHoldByPartition`, where the token itself runs
the compliance check. The video shows issuance, configuration, a blocked transfer to a
non-KYC wallet, and a compliant transfer at settlement. Limitation: the cash leg is on Arc,
so settlement is coordinated across two chains rather than atomic.

**Arc — Best DeFi/Onchain Finance Application.** The cash leg of the auction runs on Arc
testnet in USDC (ERC-20 interface at `0x3600…`). `BidEscrow` (verified on ArcScan) holds
bids, records the award delivered by a Chainlink CRE report through the forwarder, releases
USDC to the seller only after delivery is confirmed, and refunds losers by pull withdrawal.
Frontend and backend are in `apps/web`; the architecture diagram is in the README. This is a
conditional, multi-step settlement flow in stablecoins. `docs/MAINNET.md` lists the exact
steps to deploy to Arc mainnet after its launch. Limitation: delivery confirmation on Arc is
relayed by the venue operator.

**Chainlink — Best Confidential Workflow.** The award of every auction is computed inside a
CRE Confidential Workflow (`handlerInTee`, TypeScript SDK). Inside the enclave the handler
fetches two Vault secrets, retrieves the seller's sealed reserve price and a confidential
compliance screening over authenticated HTTP, verifies the reserve against its on-chain
commitment, and computes the winner. Only the winner, price, and commitment leave the enclave
as a DON-signed report written to `BidEscrow` on Arc testnet. The escrow has no other path to
award. Evidence: `docs/evidence/cre-simulate-<ref>.log` (verbatim `cre workflow simulate
--broadcast` output including the TEE constraint banner) and the resulting ArcScan
transaction. Limitation: simulated with the CRE CLI (Confidential Workflows are in private
beta); the simulator is not a hardware enclave.

## Architecture diagram

Mermaid source: `docs/architecture.md`. Export the component diagram to
`docs/architecture.png` (mermaid.live → PNG at 2× scale, or redraw in Excalidraw with the
same boxes) and embed it in the README. The video shows the PNG at 0:00 and 3:10.

## Submission checklist

| # | Requirement | Artifact | Done |
|---|---|---|---|
| H1 | ATS used to issue/manage the asset | L1 runbook evidence + video 0:20 | [ ] |
| H2 | Deployed and demonstrated on Hedera testnet | `ExitAuction` address; video | [ ] |
| H3 | Public GitHub repo | repo URL | [ ] |
| H4 | Contracts verified on HashScan | `ExitAuction` Sourcify match link | [ ] |
| H5 | Video ≤ 5 min with issuance, configuration, lifecycle op | video 0:20, 2:20, 2:50 | [ ] |
| H6 | Secondary market (extra) | whole product | [ ] |
| H7 | Compliance controls in use (extra) | video 1:15; blocked tx link | [ ] |
| H8 | Coupon configured (extra) | video 0:20, 2:50 | [ ] |
| A1 | Bounty named in the submission | form + README | [ ] |
| A2 | Working frontend and backend | `apps/web` running; video | [ ] |
| A3 | Architecture diagram | `docs/architecture.png` in README | [ ] |
| A4 | Video + presentation + documentation | video; README; docs/ | [ ] |
| A5 | Repo link | form | [ ] |
| A6 | Mainnet path | `docs/MAINNET.md` | [ ] |
| C1 | `handlerInTee` registered and used | `packages/cre-award` | [ ] |
| C2 | Sensitive input processed in the enclave | secrets, sealed reserve, screening | [ ] |
| C3 | Meaningfully integrated (no placeholder) | escrow awards only via report or documented fallback | [ ] |
| C4 | Simulation evidence | `docs/evidence/cre-simulate-*.log` + ArcScan tx + video 1:45 | [ ] |
| E1 | Video 2–4 min, ≥ 720p, human narration | final export | [ ] |
| E2 | AI-tool disclosure | `docs/AI_DISCLOSURE.md` + form field | [ ] |
| E3 | Real commit history | `git log` | [ ] |
| E4 | ≤ 3 partner prizes selected | form: Hedera, Arc, Chainlink | [ ] |
| E5 | Planning/spec artifacts committed | `PLAN.md`, `docs/specs/` | [ ] |
| E6 | Both team members on the project | ETHGlobal dashboard | [ ] |

## Form fields to prepare in advance (draft Saturday, paste Sunday)

| Field | Draft |
|---|---|
| Project name | Remate (or the final name) |
| Tagline (≤ ~100 chars) | Exit auctions for tokenized bonds: compliance on Hedera, cash on Arc, award in a TEE. |
| Description (aim ≤ 1,500 chars) | Problem (ECB numbers), what it does (7-step flow in prose), what each chain does, the limitation, links. |
| How it's made | ATS web app for issuance; Foundry contracts on Hedera (holds) and Arc (USDC escrow + CRE receiver); CRE TypeScript confidential workflow; Next.js app with viem/wagmi; operator scripts; what was hard (ATS holds, Arc fee floor, CRE forwarder). |
| GitHub | `https://github.com/lainncalvo/ethglobalOnline` |
| Video | unlisted YouTube URL |
| Partner prizes | Hedera · Tokenization of Anything / Arc · Best DeFi/Onchain Finance Application / Chainlink · Best Confidential Workflow |
| AI usage | link to `docs/AI_DISCLOSURE.md` and a two-line summary |

## Gates

- **G4 Sat 20:00** — timed dry run of the beat sheet from a clean seed, both people; feature freeze 22:00
  watching; every explorer link resolves; total under 4:00.
- [ ] `grep -rn "PRE-SUBMISSION" --include=*.md .` prints nothing (all placeholders resolved; see `PLAN.md` §2 rule 8).

- **G5 Sun 11:00** — checklist above 100% ticked; video uploaded and playable in incognito.
- **Submit by 12:00 ART Sunday.** Deadline 13:00 ART.

## Acceptance criteria

- [ ] Video 3:10–3:50, 1080p, human narration, uploaded, link public/unlisted and tested.
- [ ] README complete with deployments table, PNG, run instructions, bounty statements.
- [ ] `docs/architecture.png` exported and embedded.
- [ ] `docs/AI_DISCLOSURE.md` present and referenced in the form.
- [ ] `docs/evidence/` holds the CRE simulate log, screenshots, and a links index.
- [ ] Form submitted with exactly three partner prizes; confirmation screenshot saved.

## Minimum viable / Full

| MV | Full |
|---|---|
| Beats 0–7 with one bid pair; PNG diagram; README; disclosure; form | Captions with explorer links on every beat; second-language subtitles; a 10-second title animation |
| CRE beat from simulation (with the banner) | Same |
| Coupon beat as "configured + holder view" | Coupon paid on-screen |

## Out of scope

Landing page; pitch deck beyond the video; live-judging rehearsal (prepare only if the
project reaches Round 2 on Monday); mainnet deployment before submission.

## Known pitfalls

- Uploads take time; encoding a 1080p 3:30 video takes minutes. Start by 10:30.
- Videos outside 2:00–4:00 are rejected at upload; check duration before exporting.
- All links must open without a login: repo public, video unlisted (not private).
- A Hedera testnet reset before Sunday wipes verification; keep the re-verify command in
  `packages/contracts/README` and re-run before G5.
- Explorer pages can lag; take screenshots when the tx confirms, not during the edit.
- Do not show `.env`, private keys, or API keys; the CRE log must not print the reserve.

## Evidence

| Artifact | Link / path | Captured by | Date |
|---|---|---|---|
| | | | |
