"use client";

import { useCallback, useEffect, useState } from "react";

export function useCountdown() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  const start = useCallback((from: number) => setSeconds(from), []);

  return { seconds, isRunning: seconds > 0, start };
}