import { formatBondAmount, formatUsdc } from "@/lib/format";

export function Amount({
  value,
  decimals,
  symbol,
}: {
  value: bigint | string | null | undefined;
  decimals: number;
  symbol?: string;
}) {
  const text =
    symbol === "USDC" || (decimals === 6 && symbol === undefined)
      ? `${formatUsdc(value)} USDC`
      : formatBondAmount(value, decimals, symbol);
  return <span className="data-value amount-value">{text}</span>;
}

export function UsdcAmount({ value }: { value: bigint | string | null | undefined }) {
  return <span className="data-value amount-value">{formatUsdc(value)} USDC</span>;
}
