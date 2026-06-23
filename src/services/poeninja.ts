import type { PriceMap, TabType } from '../types';

const BASE = 'https://poe.ninja/poe2/api/economy/exchange/current/overview';

// poe.ninja PoE2 API type values (discovered from their JS bundles)
const TAB_TYPE_MAP: Partial<Record<TabType, string[]>> = {
  currency: ['Currency'],
  essence: ['Essences'],
  omen:     ['Ritual'],
  rune:     ['Runes'],
  fragment: ['Fragments'],
  quad:     ['Currency', 'Essences', 'Runes', 'Ritual', 'Fragments'],
  unique:   ['UniqueWeapons', 'UniqueArmours', 'UniqueAccessories', 'UniqueJewels', 'UniqueFlasks', 'UniqueCharms'],
  gem:      ['UncutGems', 'LineageSupportGems'],
  other:    ['Currency'],
};

interface Poe2Line {
  id: string;
  primaryValue: number;
  volumePrimaryValue?: number;
  maxVolumeCurrency?: string;
  maxVolumeRate?: number;
}

interface Poe2Item {
  id: string;
  name: string;
  image: string;
  category: string;
  detailsId: string;
}

interface Poe2Response {
  core: {
    items: Poe2Item[];
    rates: Record<string, number>;
    primary: string;
    secondary: string;
  };
  lines: Poe2Line[];
  items: Poe2Item[];
}

// Route icons through images.weserv.nl so canvas getImageData works (poecdn.com has no CORS headers)
function proxyIcon(imagePath: string): string {
  if (!imagePath) return '';
  // Normalize to a web.poecdn.com absolute URL, then strip protocol for weserv
  const abs = imagePath.startsWith('/')
    ? `web.poecdn.com${imagePath}`
    : imagePath.replace(/^https?:\/\/[^/]+/, 'web.poecdn.com');
  return `https://images.weserv.nl/?url=${encodeURIComponent(abs)}`;
}

async function fetchOverview(league: string, type: string): Promise<Poe2Response | null> {
  const url = `${BASE}?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchDivinePrice(league: string): Promise<number> {
  const data = await fetchOverview(league, 'Currency');
  // core.rates.chaos = how many chaos equal 1 divine
  return data?.core?.rates?.chaos ?? 1;
}

export async function fetchPricesForTab(
  league: string,
  tabType: TabType,
  onProgress?: (pct: number) => void
): Promise<PriceMap> {
  const types = TAB_TYPE_MAP[tabType] ?? TAB_TYPE_MAP.other!;
  const map: PriceMap = {};
  let done = 0;

  await Promise.all(
    types.map(async (type) => {
      try {
        const data = await fetchOverview(league, type);
        if (!data || !data.lines?.length) return;

        // Build id→item lookup from the items array
        const itemById: Record<string, Poe2Item> = {};
        for (const item of [...(data.core?.items ?? []), ...(data.items ?? [])]) {
          itemById[item.id] = item;
        }

        const divinePrice = data.core?.rates?.chaos ?? 1;

        for (const line of data.lines) {
          const meta = itemById[line.id];
          if (!meta) continue;
          const divineValue = line.primaryValue;
          const chaosValue = divineValue * divinePrice;
          const icon = proxyIcon(meta.image ?? '');
          map[meta.name] = { chaosValue, divineValue, icon };
        }
      } finally {
        done++;
        onProgress?.((done / types.length) * 100);
      }
    })
  );

  return map;
}

export function applyDivinePrice(map: PriceMap, divinePrice: number): PriceMap {
  if (divinePrice <= 0) return map;
  const result: PriceMap = {};
  for (const [name, entry] of Object.entries(map)) {
    result[name] = {
      ...entry,
      divineValue: entry.divineValue > 0 ? entry.divineValue : entry.chaosValue / divinePrice,
    };
  }
  return result;
}

export async function fetchAllPrices(
  league: string,
  onProgress?: (pct: number) => void
): Promise<PriceMap> {
  const types = ['Currency', 'Essences', 'Runes', 'Ritual', 'Fragments'];
  const map: PriceMap = {};
  let done = 0;

  await Promise.all(
    types.map(async (type) => {
      try {
        const data = await fetchOverview(league, type);
        if (!data || !data.lines?.length) return;

        const itemById: Record<string, Poe2Item> = {};
        for (const item of [...(data.core?.items ?? []), ...(data.items ?? [])]) {
          itemById[item.id] = item;
        }

        const divinePrice = data.core?.rates?.chaos ?? 1;

        for (const line of data.lines) {
          const meta = itemById[line.id];
          if (!meta) continue;
          const divineValue = line.primaryValue;
          const chaosValue = divineValue * divinePrice;
          const icon = proxyIcon(meta.image ?? '');
          map[meta.name] = { chaosValue, divineValue, icon };
        }
      } finally {
        done++;
        onProgress?.((done / types.length) * 100);
      }
    })
  );

  return map;
}
