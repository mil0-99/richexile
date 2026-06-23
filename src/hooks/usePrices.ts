import { useCallback, useRef, useState } from 'react';
import { applyDivinePrice, fetchDivinePrice, fetchPricesForTab } from '../services/poeninja';
import type { PriceMap, TabType } from '../types';

interface PriceState {
  map: PriceMap;
  divinePrice: number;
  loading: boolean;
  error: string | null;
  progress: number;
}

const cache = new Map<string, { map: PriceMap; divinePrice: number }>();

export function usePrices() {
  const [state, setState] = useState<PriceState>({
    map: {},
    divinePrice: 200,
    loading: false,
    error: null,
    progress: 0,
  });

  const abortRef = useRef<AbortController | null>(null);

  const loadPrices = useCallback(async (league: string, tabType: TabType) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const key = `${league}:${tabType}`;
    if (cache.has(key)) {
      const cached = cache.get(key)!;
      setState({ map: cached.map, divinePrice: cached.divinePrice, loading: false, error: null, progress: 100 });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null, progress: 0 }));

    try {
      const [divinePrice, rawMap] = await Promise.all([
        fetchDivinePrice(league),
        fetchPricesForTab(league, tabType, (pct) => {
          if (!ctrl.signal.aborted) {
            setState((s) => ({ ...s, progress: pct }));
          }
        }),
      ]);

      if (ctrl.signal.aborted) return;

      const map = applyDivinePrice(rawMap, divinePrice);
      cache.set(key, { map, divinePrice });

      setState({ map, divinePrice, loading: false, error: null, progress: 100 });
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : 'Failed to fetch prices',
          progress: 0,
        }));
      }
    }
  }, []);

  return { ...state, loadPrices };
}
