# Arc mainnet path

Arc's "Best DeFi/Onchain Finance Application" track pays part of its prize only if the same
project is **deployed to Arc mainnet by September 30, 2026**. Arc mainnet launches on
**September 16, 2026**, three days after the submission deadline, so mainnet cannot be part
of the hackathon build. This file makes the deployment a one-command step and tells the
judges that.

## What must be true in the repo before the submission deadline

| Requirement | How we satisfy it |
|---|---|
| Deploy script parameterised by chain | `packages/contracts/script/DeployArc.s.sol` reads RPC, USDC address, forwarder, and operator from environment variables; no chain-specific constants in the script |
| USDC address as a constructor argument | `BidEscrow(address usdc, address operator, address forwarder)` |
| Forwarder changeable after deploy | `BidEscrow.setForwarderAddress(address)` (owner only) |
| No testnet addresses hard-coded in contracts or app | Addresses live in `packages/shared/src/addresses.json` keyed by network; the app reads `NEXT_PUBLIC_*` env vars |
| Gas settings that survive the mainnet fee floor | Scripts pass `--with-gas-price` / `maxFeePerGas` explicitly |
| This file with the exact commands | below |

## Steps for September 16–30

1. **Confirm mainnet parameters** at `https://docs.arc.io` once published: chain id, RPC URL,
   explorer URL and verification API, USDC ERC-20 interface address (expected to be the same
   system address `0x3600000000000000000000000000000000000000`; confirm), minimum base fee.
   Record them in `addresses.json` under `arc-mainnet`.
2. **Fund a deployer** with mainnet USDC for gas (a few cents per transaction; a few dollars
   total). USDC is the native gas token on Arc.
3. **Deploy**:
   ```bash
   cd packages/contracts
   export ARC_MAINNET_RPC=<from docs.arc.io>
   export ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000   # confirm first
   export OPERATOR_ADDRESS=<operator EOA>
   export CRE_FORWARDER_ADDRESS=<production KeystoneForwarder for Arc mainnet, from the CRE forwarder directory>
   forge script script/DeployArc.s.sol --rpc-url $ARC_MAINNET_RPC --broadcast \
     --private-key $DEPLOYER_PRIVATE_KEY --with-gas-price 30gwei --priority-gas-price 1gwei
   ```
4. **Verify** on the mainnet explorer (Blockscout expected; confirm the verifier URL):
   ```bash
   forge verify-contract --chain-id <arc-mainnet-id> --verifier blockscout \
     --verifier-url <mainnet explorer>/api/ <BidEscrow address> src/arc/BidEscrow.sol:BidEscrow \
     --constructor-args $(cast abi-encode "constructor(address,address,address)" $ARC_USDC_ADDRESS $OPERATOR_ADDRESS $CRE_FORWARDER_ADDRESS)
   ```
5. **Wire CRE**: if the award workflow has been deployed to the CRE network by then, call
   `setForwarderAddress` with the production KeystoneForwarder for Arc mainnet and
   `setExpectedWorkflowId` with the deployed workflow id. If not, the operator award path
   remains the only award path on mainnet and the README says so.
6. **Smoke test** with real USDC: register a test auction, place a 1 USDC bid, award via the
   operator path, confirm delivery, withdraw. Keep the transaction hashes.
7. **Record**: add the addresses and tx hashes to `addresses.json`, `README.md` deployments
   table, and `docs/evidence/arc-mainnet.md`; tag the commit `v0.2.0-arc-mainnet`.
8. **Notify** the Arc judges through the channel ETHGlobal specifies for post-deadline
   updates (project page update, Discord thread, or the form field they provide).

## What stays on testnet

- The Hedera side (ATS bond, `ExitAuction`): the Hedera track is testnet-only by design.
- The CRE workflow: simulation unless Confidential Workflows beta access is granted;
  the Arc mainnet escrow still accepts reports from the production forwarder once wired.
- The web app can point its Arc side at mainnet through `NEXT_PUBLIC_ARC_*` variables
  while the Hedera side stays on testnet.

## Risks

- Mainnet RPC/explorer URLs and the verification API are unpublished as of 2026-09-11.
- The USDC system address is assumed identical on mainnet; confirm before deploying.
- The production forwarder address for Arc mainnet must come from the CRE forwarder
  directory at deploy time; do not reuse the testnet one.
- Mainnet fee floor may differ from testnet's 20 gwei.
- Real funds: keep the deployer and operator keys in a password manager, not in `.env` files
  on a laptop that also runs the demo.

## Checklist

- [ ] Mainnet parameters confirmed and recorded
- [ ] Deployer funded
- [ ] `BidEscrow` deployed
- [ ] Verified on the explorer
- [ ] Forwarder / workflow id set (or documented as operator-only)
- [ ] Smoke test done, hashes saved
- [ ] `addresses.json`, README, evidence updated; tag `v0.2.0-arc-mainnet`
- [ ] Judges notified

## Who does it

Open question tracked in `PLAN.md` §12: one of the two team members must be available
between September 16 and 30 for roughly two hours.
