"use client";

import { useEffect, useState } from "react";
import { deadlineUnix, isoUtc } from "@/lib/format";
import { shouldRunCountdownTimer } from "./ui/market-helpers";

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "ended";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function Countdown({
  deadline,
  nowMs,
}: {
  deadline: string | number;
  nowMs?: number;
}) {
  const unix = deadlineUnix(deadline);
  const hasSharedClock = nowMs !== undefined;
  const [standaloneNow, setStandaloneNow] = useState(() =>
    Math.floor(Date.now() / 1000),
  );
  const now = hasSharedClock ? Math.floor(nowMs / 1000) : standaloneNow;

  useEffect(() => {
    const initialNow = Math.floor(Date.now() / 1000);
    if (!shouldRunCountdownTimer(unix, initialNow, hasSharedClock)) return;

    const id = setInterval(() => {
      const nextNow = Math.floor(Date.now() / 1000);
      setStandaloneNow(nextNow);
      if (nextNow >= unix) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [hasSharedClock, unix]);

  return (
    <span title={isoUtc(unix)} className="data-value countdown-value">
      {formatRemaining(unix - now)}
    </span>
  );
}
