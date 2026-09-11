import { DEMO_WALLETS } from "./constants";
import type { AuctionDetail, AuctionView, ComplianceStatus, HealthResponse } from "./types";

const SAMPLE_REF =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const now = Math.floor(Date.now() / 1000);

export const MOCK_AUCTION: AuctionView = {
  ref: SAMPLE_REF,
  hederaAuctionId: "1",
  token: "0x0000000000000000000000000000000000000B0D",
  tokenName: "ON Serie I 2027",
  tokenSymbol: "ON27",
  seller: DEMO_WALLETS.seller,
  amount: "10",
  deadline: String(now + 45 * 60),
  hederaStatus: "Open",
  arcStatus: "Bidding",
  topBid: "2000000",
  bidCount: "2",
  winner: null,
  clearingPrice: null,
  awardSource: "None",
  links: {
    hashscanAuction: "https://hashscan.io/testnet/contract/0x0000000000000000000000000000000000000000",
    hashscanToken: "https://hashscan.io/testnet/token/0x0000000000000000000000000000000000000B0D",
    arcscanEscrow: "https://testnet.arcscan.app/address/0x0000000000000000000000000000000000000000",
  },
};

export const MOCK_DETAIL: AuctionDetail = {
  ...MOCK_AUCTION,
  bids: [
    { bidder: DEMO_WALLETS.buyerA, amount: "1000000" },
    { bidder: DEMO_WALLETS.buyerB, amount: "2000000" },
  ],
  hederaTxHash: null,
  timeline: [
    {
      step: "listed",
      chain: "hedera",
      txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      at: new Date((now - 600) * 1000).toISOString(),
    },
    {
      step: "registered",
      chain: "arc",
      txHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      at: new Date((now - 480) * 1000).toISOString(),
    },
  ],
};

export const MOCK_HEALTH: HealthResponse = {
  hedera: {
    chainId: 296,
    block: 0,
    operator: DEMO_WALLETS.operator,
    hbar: "—",
  },
  arc: {
    chainId: 5042002,
    block: 0,
    operator: DEMO_WALLETS.operator,
    usdc: "—",
  },
  addresses: {},
  awardMode: "offline",
};

export function mockCompliance(address: string): ComplianceStatus {
  const lower = address.toLowerCase();
  if (lower === DEMO_WALLETS.buyerC.toLowerCase()) {
    return {
      whitelisted: false,
      kyc: false,
      canReceive: false,
      code: "0x51",
      reasonText: "recipient KYC not granted",
    };
  }
  if (
    lower === DEMO_WALLETS.buyerA.toLowerCase() ||
    lower === DEMO_WALLETS.buyerB.toLowerCase() ||
    lower === DEMO_WALLETS.seller.toLowerCase()
  ) {
    return {
      whitelisted: true,
      kyc: true,
      canReceive: true,
      code: "0x01",
      reasonText: "transfer allowed",
    };
  }
  return {
    whitelisted: true,
    kyc: true,
    canReceive: true,
    code: "0x01",
    reasonText: "transfer allowed",
  };
}

export function isSampleRef(ref: string): boolean {
  return ref.toLowerCase() === SAMPLE_REF;
}
