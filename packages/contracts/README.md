# packages/contracts

Foundry project for `ExitAuction` (Hedera, L2) and `BidEscrow` (Arc, L3).

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
forge install foundry-rs/forge-std --no-git
```

`lib/` is gitignored. Install on every new machine before `forge test`.
Solidity 0.8.26, `evm_version = paris`.
