import { parseGwei, type Address, type Hex } from "viem";

/** ATS default partition for single-partition bonds (bytes32(uint256(1))). */
export const DEFAULT_PARTITION =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/** Hold must outlive the auction deadline by SETTLE_GRACE + 1h (spec 01 / 05). */
export const SETTLE_GRACE_SECONDS = 72 * 60 * 60;
export const HOLD_BUFFER_SECONDS = 60 * 60;
export const MIN_AUCTION_DURATION_SECONDS = 2 * 60;

export const USDC_DECIMALS = 6;
export const DEMO_AMOUNT = "10";
/** Testnet faucet pays 20 USDC; demo bids must fit in that. */
export const DEMO_RESERVE_USDC = "1";
export const DEMO_BID_A_USDC = "1";
export const DEMO_BID_B_USDC = "2";

export const HEDERA_CHAIN_ID = 296;
export const ARC_CHAIN_ID = 5042002;

export const HASHSCAN_BASE = "https://hashscan.io/testnet";
export const ARCSCAN_BASE = "https://testnet.arcscan.app";

/** Arc testnet fee floor is 20 gwei — always send 30 / 1 (spec 05). */
export const ARC_TX_FEES = {
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("1"),
} as const;

export const POLL_MS = 5_000;

export const DEMO_WALLETS = {
  seller: "0xE789FA2538505252B5dCeAe9250705046640A7D4",
  buyerA: "0x39E24D0C0a464a9249A908Cc6727cFd69Be8c1F9",
  buyerB: "0xC728d5658e1256330D842607A6029C0d06727435",
  buyerC: "0x326B63C281Ea426dd9802Fe442d920B6399a0F98",
  operator: "0x5aDCDb627A75346B74Ed9778161972F5e51E535d",
  creSigner: "0x0746C2223F371Be047dEEe889A5e9b968aF9de18",
} as const satisfies Record<string, Address>;

export const ACTOR_LABELS: Record<string, string> = {
  [DEMO_WALLETS.seller.toLowerCase()]: "Seller",
  [DEMO_WALLETS.buyerA.toLowerCase()]: "Buyer A",
  [DEMO_WALLETS.buyerB.toLowerCase()]: "Buyer B",
  [DEMO_WALLETS.buyerC.toLowerCase()]: "Buyer C",
  [DEMO_WALLETS.operator.toLowerCase()]: "Operator",
  [DEMO_WALLETS.creSigner.toLowerCase()]: "CRE signer",
};

export const HEDERA_STATUS = ["None", "Open", "Settled", "Cancelled"] as const;
export const ARC_STATUS = [
  "None",
  "Bidding",
  "Awarded",
  "Settled",
  "Voided",
  "Cancelled",
  "Expired",
  "NoWinner",
] as const;
export const AWARD_SOURCE = ["None", "CRE", "Operator"] as const;

export const TERMINAL_ARC = new Set(["Voided", "Cancelled", "Expired", "NoWinner"]);

export const OPERATOR_TOKEN_KEY = "OPERATOR_UI_TOKEN";
