import { useEffect, useState } from "react";

/**
 * A clock that ticks every `intervalMs`, keeping countdowns ("Jummah in
 * 4 min", "Leave within 2 minutes") honest while the page sits open.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
