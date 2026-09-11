# Evidence

Everything a judge needs to verify our claims without trusting the video. Capture as you go; do
not leave it for Sunday.

## Layout

```
docs/evidence/
├── README.md                        # this file
├── cre-simulate-<ref8>-award.log    # verbatim `cre workflow simulate` transcript, awarded branch
├── cre-simulate-<ref8>-nowinner.log # verbatim transcript, no-winner branch (reserve not met or no compliant bid)
├── cre-simulate-<ref8>.png          # screenshot of the terminal incl. the TEE-constraint banner
├── tx-index.md                      # every explorer link used in README/video, one line each
├── hashscan-*.png / arcscan-*.png   # explorer screenshots of key transactions
└── raw/                             # gitignored: full-resolution recordings, scratch captures
```

`<ref8>` = first 8 hex chars of the auction `ref` (without `0x`).

## Chainlink evidence (bounty requirement)

The track accepts "a demo video, terminal output, execution logs, or deployment details". Capture
all of these from **simulation** (Confidential Workflows are in private beta; simulation is
explicitly accepted):

1. Run `cre workflow simulate ./award-workflow --target staging-settings --broadcast --listen`
   and trigger it with the backend's close endpoint (or `curl`). Save the **complete** terminal
   output to `cre-simulate-<ref8>-award.log`. It must include the banner that starts with
   "Trigger requested TEE Execution" — that line proves the handler was registered with
   `handlerInTee`.
2. Repeat for a no-winner case (a reserve above every bid) → `cre-simulate-<ref8>-nowinner.log`.
3. Record the ArcScan transaction hash of the `Awarded` event written by the report delivery and
   put it in `tx-index.md` with the label `CRE report → BidEscrow.onReport`.
4. Negative control: `grep` the logs for the reserve value and both API keys; the result must be
   empty. Note the command and its empty output at the bottom of `tx-index.md`.
5. Do not edit the logs. If a log contains something that must not be public, re-run instead.

## Hedera evidence

- HashScan link to the ATS bond (token page), to the `ExitAuction` contract with the "verified"
  badge, to the `HeldByPartition` transaction (listing), to the successful `settle` transaction
  (`HoldByPartitionExecuted`), and to the **reverted** `settle` attempt against the non-KYC wallet.
- Screenshots of the ATS web app: bond creation, whitelist/KYC screen, coupon configuration,
  holders view after settlement.

## Arc evidence

- ArcScan links: `BidEscrow` verified; `AuctionRegistered`; both `BidPlaced`; `Awarded`;
  `DeliveryConfirmed`; the loser's `Withdrawn`.

## tx-index.md format

```
| Step | Chain | Tx / URL | Notes |
|---|---|---|---|
| Bond created | Hedera | https://hashscan.io/testnet/token/0.0.… | ATS web app |
| Hold created | Hedera | https://hashscan.io/testnet/transaction/… | seller → escrow ExitAuction |
| ... | | | |
```

## Rules

- Never capture a screen with a private key, a `.env` file, the reserve value, or an API key.
- Every link in `README.md` and every on-screen tx in the video must appear in `tx-index.md`.
