# L1 evidence — ATS bond on Hedera testnet

Captured 2026-09-11. Official Studio issuance + on-chain configuration.

## Bond

| Item | Value |
|---|---|
| Name / symbol / decimals | `ON Serie I 2027` / `ONS1` / `0` |
| EVM | `0x619dc395ec05139cdfaa8089c854568e398463dd` |
| Hedera id | `0.0.10485273` |
| HashScan | https://hashscan.io/testnet/token/0.0.10485273 |
| Control list | whitelist (`getControlListType` = true) |
| Internal KYC | on |
| Maturity | 2027-03-31 |

## Wallets

| Actor | Hedera | EVM | Whitelist | KYC |
|---|---|---|---|---|
| Issuer | `0.0.10483079` | `0x5181d07b55ad3496c8bd4671fa50f8451ce0c98a` | no | — |
| Seller | `0.0.10484830` | `0xE789FA2538505252B5dCeAe9250705046640A7D4` | yes | GRANTED |
| Buyer A | `0.0.10484836` | `0x39E24D0C0a464a9249A908Cc6727cFd69Be8c1F9` | yes | GRANTED |
| Buyer B | `0.0.10484843` | `0xC728d5658e1256330D842607A6029C0d06727435` | yes | GRANTED |
| Buyer C | `0.0.10484847` | `0x326B63C281Ea426dd9802Fe442d920B6399a0F98` | no | NOT_GRANTED |

KYC grants (Issuer → token `grantKyc`):

- Seller https://hashscan.io/testnet/transaction/0xdf10d5d332d241bf3474856b9158cad031d7820abb9152591da0f1ddee62980a
- Buyer A https://hashscan.io/testnet/transaction/0x0a5d679d834b0ef31b922ddfba4d74dd88ed03f9158b0061695b0e0aba3fb833
- Buyer B https://hashscan.io/testnet/transaction/0x50b5399d44db785e029425c19912e031e73bb6513eea2071a7871cd91046d358

Studio KYC UI requires a Terminal3 `.vc` file; grants were submitted with the Issuer key against the same token the Studio deployed.

## Balances after mint + hold sanity

- Seller available: **99** (minted 100; 1 delivered to Buyer A in the hold test)
- Buyer A: **1**
- Buyer C: **0**
- `totalSupply`: 100
- Coupon id **1**, rate 9.00% (`setCoupon` https://hashscan.io/testnet/transaction/0xb9156e090899e4c8ca3f8f2d35815a686a91b094303ca2f21f2ed6bdd7de9760)

## Hold sanity

| Step | Result | Tx |
|---|---|---|
| Seller hold 1, escrow = Operator | success; avail 99 / held 1 | https://hashscan.io/testnet/transaction/0xf98b1ed15900b4342ef80dbe093a12a6f0aebd177e63ffb10b214abc3f15c4af |
| Non-escrow (`Buyer A`) execute | revert | https://hashscan.io/testnet/transaction/0x43de560eb6b510db4c46ee918ed8d9fbee49926b1b08d10f700e35624b221d9d |
| Operator execute to Buyer A | success; A = 1 | https://hashscan.io/testnet/transaction/0xc5a07a5489f552f79d89eb9eac1c700a2fab23daa5738660bee307c6ed0a636d |
| Operator execute hold 2 to Buyer C | revert | https://hashscan.io/testnet/transaction/0xf98d4c52b0afaf833d2ff346d1b0233515655ea8f70c277be987678ec7f3cdd5 |
| Operator release hold 2 | success; Seller avail 99 | https://hashscan.io/testnet/transaction/0x76d515d11fc5a045e20593117443b2e71265a5cfd48aeffc3657099367cf0e16 |
| Reclaim before expiry | revert | https://hashscan.io/testnet/transaction/0xa345f29f2909c35878fea9c2035771e34f55340580514e7f4c8f1a3eb5cb5ea4 |
| `transfer` Seller → Buyer C | revert | https://hashscan.io/testnet/transaction/0x175adda93921d059e4e2104099931af4325c05fc3fdd78bfb6a5d71989605eaa |

`canTransferByPartition(Seller → A)` = true / `0x01`. `(Seller → C)` = false / `0x10`.

## Studio screenshots

- `docs/evidence/screenshots/l1-coupon.png` — coupon id 1, 9.00% (Studio shows the raw `900` + 2 decimals)
- `docs/evidence/screenshots/l1-allowed-list.png` — Seller `0.0.10484830`, Buyer A `0.0.10484836`, Buyer B `0.0.10484843`
