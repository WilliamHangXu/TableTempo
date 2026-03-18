import { useEffect, useState } from "react";

interface TickState {
  perf: number;
  epoch: number;
}

function readClock(): TickState {
  return {
    perf: performance.now(),
    epoch: Date.now()
  };
}

export function useTicker(active: boolean, intervalMs = 100): TickState {
  const [tick, setTick] = useState<TickState>(() => readClock());

  useEffect(() => {
    setTick(readClock());

    if (!active) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTick(readClock());
    }, intervalMs);

    const handleVisibilityChange = () => {
      setTick(readClock());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active, intervalMs]);

  return tick;
}
