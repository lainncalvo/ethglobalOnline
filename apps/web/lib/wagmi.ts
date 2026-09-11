import { defineChain } from "viem";
import { createConfig, http, injected } from "wagmi";

const hederaRpc =
  process.env.NEXT_PUBLIC_HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
const arcRpc = process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.io";

export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [hederaRpc] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
});

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [arcRpc] } },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
});

export const wagmiConfig = createConfig({
  chains: [hederaTestnet, arcTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [hederaTestnet.id]: http(hederaRpc, { timeout: 120_000, retryCount: 2 }),
    [arcTestnet.id]: http(arcRpc, { timeout: 30_000 }),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
