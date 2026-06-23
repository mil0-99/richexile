import type {
  CurrencyOverviewResponse,
  ItemOverviewResponse,
  PriceMap,
  TabType,
} from '../types';

const BASE = 'https://poe.ninja/api/data';

// Poe.ninja item types by stash tab type
const TAB_TYPE_MAP: Partial<Record<TabType, { endpoint: 'currency' | 'item'; type: string }[]>> = {
  currency: [{ endpoint: 'currency', type: 'Currency' }],
  essence: [{ endpoint: 'item', type: 'Essence' }],
  omen: [{ endpoint: 'item', type: 'Omen' }],
  rune: [{ endpoint: 'item', type: 'KalguuranRune' }],
  fragment: [
    { endpoint: 'currency', type: 'Fragment' },
    { endpoint: 'item', type: 'Scarab' },
  ],
  unique: [
    { endpoint: 'item', type: 'UniqueArmour' },
    { endpoint: 'item', type: 'UniqueWeapon' },
    { endpoint: 'item', type: 'UniqueAccessory' },
    { endpoint: 'item', type: 'UniqueJewel' },
  ],
  gem: [{ endpoint: 'item', type: 'SkillGem' }],
  quad: [
    { endpoint: 'currency', type: 'Currency' },
    { endpoint: 'item', type: 'Essence' },
    { endpoint: 'item', type: 'Omen' },
    { endpoint: 'item', type: 'KalguuranRune' },
  ],
  other: [{ endpoint: 'currency', type: 'Currency' }],
};

async function fetchWithFallback(url: string): Promise<Response> {
  // Direct fetch first (poe.ninja allows CORS)
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) return res;
  } catch {
    // CORS issue in dev — fall through to proxy
  }

  // Use dev proxy if available
  const proxyUrl = url.replace('https://poe.ninja/api/data', '/poeninja-api');
  return fetch(proxyUrl, { headers: { 'Accept': 'application/json' } });
}

export async function fetchDivinePrice(league: string): Promise<number> {
  try {
    const url = `${BASE}/currencyoverview?league=${encodeURIComponent(league)}&type=Currency`;
    const res = await fetchWithFallback(url);
    if (!res.ok) return 200;

    const data: CurrencyOverviewResponse = await res.json();
    const divine = data.lines.find(
      (l) => l.currencyTypeName === 'Divine Orb'
    );
    return divine?.chaosEquivalent ?? 200;
  } catch {
    return 200;
  }
}

export async function fetchPricesForTab(
  league: string,
  tabType: TabType,
  onProgress?: (pct: number) => void
): Promise<PriceMap> {
  const sources = TAB_TYPE_MAP[tabType] ?? TAB_TYPE_MAP.other!;
  const map: PriceMap = {};
  let done = 0;

  await Promise.all(
    sources.map(async (src) => {
      try {
        let url: string;
        if (src.endpoint === 'currency') {
          url = `${BASE}/currencyoverview?league=${encodeURIComponent(league)}&type=${src.type}`;
        } else {
          url = `${BASE}/itemoverview?league=${encodeURIComponent(league)}&type=${src.type}`;
        }

        const res = await fetchWithFallback(url);
        if (!res.ok) return;

        if (src.endpoint === 'currency') {
          const data: CurrencyOverviewResponse = await res.json();

          // Build icon map from currencyDetails
          const iconMap: Record<string, string> = {};
          for (const d of data.currencyDetails) {
            iconMap[d.name] = d.icon;
          }

          for (const line of data.lines) {
            const chaosValue = line.chaosEquivalent ?? line.receive?.value ?? 0;
            map[line.currencyTypeName] = {
              chaosValue,
              divineValue: 0, // filled after we know divine price
              icon: iconMap[line.currencyTypeName] ?? '',
            };
          }
        } else {
          const data: ItemOverviewResponse = await res.json();
          for (const line of data.lines) {
            map[line.name] = {
              chaosValue: line.chaosValue,
              divineValue: line.divineValue,
              icon: line.icon,
            };
          }
        }
      } catch {
        // silently skip failed endpoints
      } finally {
        done++;
        onProgress?.((done / sources.length) * 100);
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

// Fetch all price data at once (used for quad tab that needs multiple types)
export async function fetchAllPrices(
  league: string,
  onProgress?: (pct: number) => void
): Promise<PriceMap> {
  const types: { endpoint: 'currency' | 'item'; type: string }[] = [
    { endpoint: 'currency', type: 'Currency' },
    { endpoint: 'item', type: 'Essence' },
    { endpoint: 'item', type: 'Omen' },
    { endpoint: 'item', type: 'KalguuranRune' },
    { endpoint: 'item', type: 'Scarab' },
    { endpoint: 'currency', type: 'Fragment' },
  ];

  const map: PriceMap = {};
  let done = 0;

  await Promise.all(
    types.map(async (src) => {
      try {
        let url: string;
        if (src.endpoint === 'currency') {
          url = `${BASE}/currencyoverview?league=${encodeURIComponent(league)}&type=${src.type}`;
        } else {
          url = `${BASE}/itemoverview?league=${encodeURIComponent(league)}&type=${src.type}`;
        }

        const res = await fetchWithFallback(url);
        if (!res.ok) return;

        if (src.endpoint === 'currency') {
          const data: CurrencyOverviewResponse = await res.json();
          const iconMap: Record<string, string> = {};
          for (const d of data.currencyDetails) iconMap[d.name] = d.icon;
          for (const line of data.lines) {
            map[line.currencyTypeName] = {
              chaosValue: line.chaosEquivalent ?? 0,
              divineValue: 0,
              icon: iconMap[line.currencyTypeName] ?? '',
            };
          }
        } else {
          const data: ItemOverviewResponse = await res.json();
          for (const line of data.lines) {
            map[line.name] = {
              chaosValue: line.chaosValue,
              divineValue: line.divineValue,
              icon: line.icon,
            };
          }
        }
      } catch {
        // silent
      } finally {
        done++;
        onProgress?.((done / types.length) * 100);
      }
    })
  );

  return map;
}
