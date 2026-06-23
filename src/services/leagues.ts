import type { League } from '../types';

// Known PoE2 leagues as fallback if the API is unavailable
const FALLBACK_LEAGUES: League[] = [
  { id: 'Dawn of the Hunt', realm: 'poe2', season: 'Dawn of the Hunt' },
  { id: 'Standard', realm: 'poe2' },
  { id: 'Hardcore', realm: 'poe2' },
];

interface GGGLeague {
  id: string;
  realm?: string;
  category?: { id: string };
}

export async function fetchLeagues(): Promise<League[]> {
  try {
    // GGG official API — may or may not have CORS headers
    const res = await fetch(
      'https://api.pathofexile.com/leagues?type=main&realm=poe2&limit=50',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) return FALLBACK_LEAGUES;

    const data: GGGLeague[] | { leagues: GGGLeague[] } = await res.json();
    const items: GGGLeague[] = Array.isArray(data) ? data : data.leagues ?? [];

    const leagues: League[] = items
      .filter((l) => l.realm === 'poe2' || !l.realm)
      .map((l) => ({
        id: l.id,
        realm: 'poe2',
        season: l.category?.id !== 'Standard' ? l.id : undefined,
      }));

    return leagues.length > 0 ? leagues : FALLBACK_LEAGUES;
  } catch {
    return FALLBACK_LEAGUES;
  }
}

export function getCurrentLeague(leagues: League[]): League {
  // Prefer the first non-Standard, non-Hardcore league (i.e. the seasonal one)
  const seasonal = leagues.find(
    (l) => l.id !== 'Standard' && l.id !== 'Hardcore' && !l.id.toLowerCase().includes('hardcore')
  );
  return seasonal ?? leagues[0] ?? FALLBACK_LEAGUES[0];
}
