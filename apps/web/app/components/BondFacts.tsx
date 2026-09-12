"use client";

import { atsBondAbi } from "@/lib/abi";
import { bytes3ToAscii, isoUtc } from "@/lib/format";
import { formatUnits } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { HEDERA_CHAIN_ID } from "@/lib/constants";
import { hederaTestnet } from "@/lib/wagmi";
import { ExplorerLink } from "./ExplorerLink";

export function BondFacts({
  token,
  name,
  symbol,
}: {
  token: `0x${string}`;
  name?: string;
  symbol?: string;
}) {
  const enabled = Boolean(token && token !== "0x0000000000000000000000000000000000000000");
  const common = { address: token, abi: atsBondAbi, chainId: HEDERA_CHAIN_ID, query: { enabled } } as const;

  const reads = useReadContracts({
    contracts: [
      { ...common, functionName: "name" },
      { ...common, functionName: "symbol" },
      { ...common, functionName: "getNominalValue" },
      { ...common, functionName: "getNominalValueDecimals" },
      { ...common, functionName: "getNominalValueCurrency" },
      { ...common, functionName: "getMaturityDate" },
      { ...common, functionName: "getCouponCount" },
    ],
    query: { enabled },
  });

  const [onName, onSymbol, nominal, nominalDecimals, currency, maturity, couponCount] = reads.data ?? [];
  const count = couponCount?.status === "success" ? Number(couponCount.result) : 0;
  const coupon = useReadContract({
    address: token,
    abi: atsBondAbi,
    functionName: "getCoupon",
    args: [BigInt(count)],
    chainId: hederaTestnet.id,
    query: { enabled: enabled && count > 0 },
  });

  const displayName = (onName?.status === "success" && onName.result) || name || "Bond";
  const displaySymbol = (onSymbol?.status === "success" && onSymbol.result) || symbol || "";
  const nv = nominal?.status === "success" ? nominal.result : undefined;
  const nd = nominalDecimals?.status === "success" ? Number(nominalDecimals.result) : 2;
  const cur = currency?.status === "success" ? bytes3ToAscii(currency.result as string) : "";
  const mat = maturity?.status === "success" ? Number(maturity.result) : 0;
  const couponData = coupon.data?.[0]?.coupon;

  return (
    <section className="card bond-facts">
      <div className="bond-facts__header">
        <div>
          <p className="market-phase">Instrument</p>
          <h2>{displayName}</h2>
          {displaySymbol ? <p className="hash muted">{displaySymbol}</p> : null}
        </div>
        <ExplorerLink chain="hedera" address={token}>
          Token on HashScan
        </ExplorerLink>
      </div>
      <dl className="bond-facts__list">
        <div className="bond-facts__row">
          <dt>Nominal</dt>
          <dd className="data-value">
            {nv !== undefined ? `${formatUnits(nv, nd)} ${cur || "USD"}` : "—"}
          </dd>
        </div>
        <div className="bond-facts__row">
          <dt>Maturity</dt>
          <dd className="data-value">{mat ? isoUtc(mat).slice(0, 10) : "—"}</dd>
        </div>
        <div className="bond-facts__row bond-facts__row--stacked">
          <dt>Next coupon</dt>
          <dd>
            {couponData
              ? `${formatUnits(couponData.rate, couponData.rateDecimals)}% · rec ${isoUtc(Number(couponData.recordDate)).slice(0, 10)} · pay ${isoUtc(Number(couponData.executionDate)).slice(0, 10)}`
              : count === 0
                ? "none"
                : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
