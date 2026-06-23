import type { League } from '../types';

// All PoE2 seasonal leagues that have data on poe.ninja (newest first)
const LEAGUES: League[] = [
  { id: 'Runes of Aldur',     realm: 'poe2', season: 'Runes of Aldur'     },
  { id: 'HC Runes of Aldur',  realm: 'poe2', season: 'Runes of Aldur'     },
  { id: 'Fate of the Vaal',   realm: 'poe2', season: 'Fate of the Vaal'   },
  { id: 'Rise of the Abyssal',realm: 'poe2', season: 'Rise of the Abyssal'},
  { id: 'Dawn of the Hunt',   realm: 'poe2', season: 'Dawn of the Hunt'   },
  { id: 'Standard',           realm: 'poe2'                                },
  { id: 'Hardcore',           realm: 'poe2'                                },
];

export async function fetchLeagues(): Promise<League[]> {
  return LEAGUES;
}

export function getCurrentLeague(leagues: League[]): League {
  return leagues[0] ?? LEAGUES[0];
}
