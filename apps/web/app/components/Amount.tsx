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
    symbol === "USDC" || decimals === 6 && symbol === undefined
      ? `${formatUsdc(value)} USDC`
      : formatBondAmount(value, decimals, symbol);
  return <span>{text}</span>;
}

export function UsdcAmount({ value }: { value: bigint | string | null | undefined }) {
  return <span>{formatUsdc(value)} USDC</span>;
}
