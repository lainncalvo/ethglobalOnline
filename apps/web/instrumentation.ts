export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.TICK_ENABLED === "0") return;
  const raw = Number(process.env.TICK_INTERVAL_MS ?? "60000");
  const intervalMs = Number.isFinite(raw) && raw >= 5_000 ? raw : 60_000;
  const { runTick } = await import("./lib/handlers/tick");
  console.log(JSON.stringify({ tick: true, started: true, intervalMs }));
  setInterval(() => {
    void runTick().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "tick failed";
      console.error(JSON.stringify({ tick: true, error: "UNKNOWN", message }));
    });
  }, intervalMs);
}
