"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { ApiEnvelope, DataSource } from "@/lib/types";

type Result<T> = {
  key: string;
  data: T | null;
  source?: DataSource;
  notice?: string;
  error: string | null;
};

/**
 * Run an async search whenever `key` changes. Loading/empty states are derived
 * from whether the stored result matches the current key, so no state is set
 * synchronously inside the effect.
 */
export function useSearch<T>(key: string, run: () => Promise<ApiEnvelope<T>>, empty: T) {
  const [result, setResult] = useState<Result<T>>({ key: "", data: null, error: null });
  const start = useEffectEvent(() => run());

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    start()
      .then((r) => {
        if (!cancelled) setResult({ key, data: r.data, source: r.source, notice: r.notice, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setResult({ key, data: null, error: e instanceof Error ? e.message : "Search failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = !!key && result.key === key;
  return {
    data: current && result.data ? result.data : empty,
    loading: !!key && !current,
    source: current ? result.source : undefined,
    notice: current ? result.notice : undefined,
    error: current ? result.error : null,
    /** True once a search for the current key has produced a result (or error). */
    done: current,
  };
}
