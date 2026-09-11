# Demo wallets (L0)

Addresses only. Keys live in `scripts/.env`, `packages/contracts/.env`, `apps/web/.env.local` and `packages/cre-award/.env` (gitignored).

| Actor | Address | Hedera HBAR | Arc USDC |
|---|---|---|---|
| Issuer | `0x5181d07b55ad3496c8bd4671fa50f8451ce0c98a` | portal faucet | n/a |
| Seller | `0xE789FA2538505252B5dCeAe9250705046640A7D4` | send ~20 HBAR from Issuer | optional |
| Buyer A | `0x39E24D0C0a464a9249A908Cc6727cFd69Be8c1F9` | send ~20 HBAR from Issuer | [faucet.circle.com](https://faucet.circle.com) Arc Testnet |
| Buyer B | `0xC728d5658e1256330D842607A6029C0d06727435` | send ~20 HBAR from Issuer | faucet |
| Buyer C | `0x326B63C281Ea426dd9802Fe442d920B6399a0F98` | send ~20 HBAR from Issuer | optional |
| Operator | `0x5aDCDb627A75346B74Ed9778161972F5e51E535d` | send ~20 HBAR from Issuer | faucet |
| CRE signer | `0x0746C2223F371Be047dEEe889A5e9b968aF9de18` | send ~20 HBAR from Issuer | faucet |

Issuer: create an ECDSA account at https://portal.hedera.com, import the key into MetaMask (Hedera Testnet, chain 296), then fund the six EOAs. Paste the Issuer address into `packages/shared/src/addresses.json` → `demoWallets.issuer` in its own commit.
