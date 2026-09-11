export default async function AuctionPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Auction</h1>
      <p className="mt-2 font-mono text-sm break-all">{ref}</p>
      <p className="mt-2 text-neutral-600">Lane L6 fills bidding, eligibility and withdraw.</p>
    </main>
  );
}
