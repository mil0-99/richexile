import { ChevronDown, Globe } from 'lucide-react';
import { useRef, useState } from 'react';
import type { League } from '../types';

interface Props {
  leagues: League[];
  selected: League | null;
  onChange: (l: League) => void;
  loading: boolean;
}

export function LeagueSelector({ leagues, selected, onChange, loading }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (l: League) => {
    onChange(l);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 hover:border-amber-600/50 transition-colors text-sm text-stone-300"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
      >
        <Globe className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-medium">{loading ? 'Loading…' : (selected?.id ?? 'Select League')}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg bg-stone-900 border border-stone-700 shadow-xl z-50 overflow-hidden">
          {leagues.length === 0 && (
            <p className="px-3 py-2 text-sm text-stone-500">No leagues found</p>
          )}
          {leagues.map((l) => (
            <button
              key={l.id}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-800 transition-colors flex items-center justify-between ${
                selected?.id === l.id ? 'text-amber-300 bg-amber-900/20' : 'text-stone-300'
              }`}
              onClick={() => handleSelect(l)}
            >
              <span>{l.id}</span>
              {!l.season && (
                <span className="text-xs text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                  {l.id}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
