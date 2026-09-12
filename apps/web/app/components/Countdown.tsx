"use client";

import { useEffect, useState } from "react";
import { deadlineUnix, isoUtc } from "@/lib/format";

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "ended";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function Countdown({ deadline }: { deadline: string | number }) {
  const unix = deadlineUnix(deadline);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span title={isoUtc(unix)} className="data-value countdown-value">
      {formatRemaining(unix - now)}
    </span>
  );
}
