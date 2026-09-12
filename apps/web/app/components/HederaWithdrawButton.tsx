"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { bidEscrowAbi } from "@/lib/abi";
import { HEDERA_CHAIN_ID } from "@/lib/constants";
import { formatUsdc } from "@/lib/format";
import { getHederaRailAddresses } from "@/lib/hedera-addresses";
import { ExplorerLink } from "./ExplorerLink";
import { TxError } from "./TxError";

export function HederaWithdrawButton({ auctionRef }: { auctionRef: Hex }) {
  const { hederaBidEscrow: escrow } = getHederaRailAddresses();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: HEDERA_CHAIN_ID });
  const queryClient = useQueryClient();
  const [hash, setHash] = useState<Hex>();
  const [error, setError] = useState<unknown>();

  const refundable = useReadContract({
    address: escrow,
    abi: bidEscrowAbi,
    functionName: "refundable",
    args: address ? [auctionRef, address] : undefined,
    chainId: HEDERA_CHAIN_ID,
    query: { enabled: Boolean(address && escrow), refetchInterval: 5_000 },
  });

  const amount = refundable.data ?? 0n;
  if (!address || !escrow || amount === 0n) return null;

  return (
    <section className="card refund-ticket">
      <div className="order-ticket__header">
        <div>
          <p className="market-phase">Refund available</p>
          <h2>Withdraw</h2>
        </div>
        <span className="status-indicator">Hedera</span>
      </div>
      <div className="refund-ticket__amount">
        <span className="muted">Refundable balance</span>
        <strong className="data-value">{formatUsdc(amount)} USDC</strong>
      </div>
      <button
        type="button"
        className="btn btn-primary refund-ticket__action"
        disabled={isPending}
        onClick={async () => {
          try {
            setError(undefined);
            if (chainId !== HEDERA_CHAIN_ID) {
              await switchChainAsync({ chainId: HEDERA_CHAIN_ID });
            }
            const sent = await writeContractAsync({
              address: escrow,
              abi: bidEscrowAbi,
              functionName: "withdraw",
              args: [auctionRef],
              chainId: HEDERA_CHAIN_ID,
              gas: 1_500_000n,
            });
            setHash(sent);
            await publicClient?.waitForTransactionReceipt({
              hash: sent,
              confirmations: 1,
              timeout: 180_000,
            });
            await queryClient.invalidateQueries({ queryKey: ["auction", auctionRef] });
            await refundable.refetch();
          } catch (err) {
            setError(err);
          }
        }}
      >
        {isPending ? "Withdrawing…" : "Withdraw"}
      </button>
      {hash ? (
        <p className="refund-ticket__receipt">
          <ExplorerLink chain="hedera" hash={hash} />
        </p>
      ) : null}
      <TxError error={error} />
    </section>
  );
}
