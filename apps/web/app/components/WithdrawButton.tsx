"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { bidEscrowAbi } from "@/lib/abi";
import { ARC_CHAIN_ID, ARC_TX_FEES } from "@/lib/constants";
import { formatUsdc } from "@/lib/format";
import { ExplorerLink } from "./ExplorerLink";
import { TxError } from "./TxError";

export function WithdrawButton({ auctionRef, escrow }: { auctionRef: Hex; escrow?: Address }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const queryClient = useQueryClient();
  const [hash, setHash] = useState<Hex>();
  const [error, setError] = useState<unknown>();

  const refundable = useReadContract({
    address: escrow,
    abi: bidEscrowAbi,
    functionName: "refundable",
    args: address ? [auctionRef, address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address && escrow), refetchInterval: 5_000 },
  });

  const amount = refundable.data ?? 0n;
  if (!address || !escrow || amount === 0n) return null;

  return (
    <section className="card">
      <h2 className="mb-2">Withdraw</h2>
      <p className="mb-3">{formatUsdc(amount)} USDC is refundable.</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={isPending}
        onClick={async () => {
          try {
            setError(undefined);
            if (chainId !== ARC_CHAIN_ID) await switchChainAsync({ chainId: ARC_CHAIN_ID });
            const sent = await writeContractAsync({
              address: escrow,
              abi: bidEscrowAbi,
              functionName: "withdraw",
              args: [auctionRef],
              chainId: ARC_CHAIN_ID,
              ...ARC_TX_FEES,
            });
            setHash(sent);
            await publicClient?.waitForTransactionReceipt({ hash: sent, confirmations: 1, timeout: 180_000 });
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
        <p className="mt-2">
          <ExplorerLink chain="arc" hash={hash} />
        </p>
      ) : null}
      <TxError error={error} />
    </section>
  );
}
