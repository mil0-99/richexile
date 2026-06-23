import { Coins } from 'lucide-react';
import type { League } from '../types';
import { LeagueSelector } from './LeagueSelector';

interface HeaderProps {
  leagues: League[];
  selectedLeague: League | null;
  onLeagueChange: (league: League) => void;
  leaguesLoading: boolean;
}

export function Header({ leagues, selectedLeague, onLeagueChange, leaguesLoading }: HeaderProps) {
  return (
    <header className="border-b border-amber-900/40 bg-stone-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-amber-300 leading-none tracking-wide">
              Rich Exile
            </h1>
            <p className="text-xs text-stone-500 leading-none mt-0.5">PoE2 Stash Valuation</p>
          </div>
        </div>

        <LeagueSelector
          leagues={leagues}
          selected={selectedLeague}
          onChange={onLeagueChange}
          loading={leaguesLoading}
        />
      </div>
    </header>
  );
}
