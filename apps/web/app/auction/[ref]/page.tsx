import { AuctionDetail } from "../../components/AuctionDetail";

export default async function AuctionPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return <AuctionDetail ref={ref} />;
}
