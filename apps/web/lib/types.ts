export type HederaStatus = "Open" | "Settled" | "Cancelled";
export type ArcStatus =
  | "None"
  | "Bidding"
  | "Awarded"
  | "Settled"
  | "Voided"
  | "Cancelled"
  | "Expired"
  | "NoWinner";
export type AwardSource = "None" | "CRE" | "Operator";

/** Public auction row from GET /api/auctions (spec 04). Amounts are base-unit strings. */
export type AuctionView = {
  ref: string;
  hederaAuctionId: string;
  token: string;
  tokenName: string;
  tokenSymbol: string;
  seller: string;
  amount: string;
  deadline: string;
  hederaStatus: HederaStatus;
  arcStatus: ArcStatus;
  topBid: string | null;
  bidCount: string;
  winner: string | null;
  clearingPrice: string | null;
  awardSource: AwardSource;
  links: {
    hashscanAuction: string;
    hashscanToken: string;
    arcscanEscrow: string;
  };
};

export type TimelineEntry = {
  step: string;
  chain: "hedera" | "arc";
  txHash?: string;
  at: string;
};

export type BidRow = {
  bidder: string;
  amount: string;
};

export type AuctionDetail = AuctionView & {
  bids: BidRow[];
  clearingPrice: string | null;
  hederaTxHash: string | null;
  timeline: TimelineEntry[];
};

export type ComplianceStatus = {
  whitelisted: boolean;
  kyc: boolean;
  canReceive: boolean;
  code: string;
  reasonText: string;
};

export type HealthResponse = {
  hedera: {
    chainId: number;
    block: string | number;
    operator: string;
    hbar: string;
  };
  arc: {
    chainId: number;
    block: string | number;
    operator: string;
    usdc: string;
  };
  addresses: Record<string, unknown>;
  awardMode: string;
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};

export type StepStatus = "idle" | "pending" | "done" | "error";

export type TxStep = {
  id: string;
  label: string;
  status: StepStatus;
  hash?: string;
  chain?: "hedera" | "arc";
  error?: string;
};

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}
