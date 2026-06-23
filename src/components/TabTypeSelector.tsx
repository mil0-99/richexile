import type { TabType } from '../types';

const TABS: { type: TabType; label: string; desc: string; icon: string; reliability: 'high' | 'medium' | 'low' }[] = [
  { type: 'currency',  label: 'Currency',  desc: 'Currency stash tab',           icon: '💰', reliability: 'high'   },
  { type: 'essence',   label: 'Essence',   desc: 'Essence stash tab',            icon: '💎', reliability: 'high'   },
  { type: 'omen',      label: 'Omen',      desc: 'Omen stash tab',               icon: '🌀', reliability: 'high'   },
  { type: 'rune',      label: 'Rune',      desc: 'Kalguuran Rune stash tab',     icon: '🔷', reliability: 'high'   },
  { type: 'fragment',  label: 'Fragment',  desc: 'Fragment / Scarab tab',        icon: '🧩', reliability: 'medium' },
  { type: 'quad',      label: 'Quad',      desc: 'Quad tab (partial supported)', icon: '📦', reliability: 'medium' },
  { type: 'unique',    label: 'Unique',    desc: 'Unique item tab',              icon: '⚔️',  reliability: 'low'    },
  { type: 'gem',       label: 'Gem',       desc: 'Gem tab',                      icon: '🔮', reliability: 'low'    },
  { type: 'other',     label: 'Other',     desc: 'General / regular tab',        icon: '📋', reliability: 'medium' },
];

const RELIABILITY_CLASSES = {
  high:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low:    'text-red-400 bg-red-500/10 border-red-500/30',
};

const RELIABILITY_LABELS = {
  high:   'High accuracy',
  medium: 'Medium accuracy',
  low:    'Low accuracy',
};

interface Props {
  selected: TabType | null;
  onChange: (t: TabType) => void;
}

export function TabTypeSelector({ selected, onChange }: Props) {
  return (
    <div>
      <p className="text-xs text-stone-500 mb-2 uppercase tracking-wider">Select stash tab type</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => onChange(t.type)}
            title={t.desc}
            className={`
              relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-center transition-all
              ${selected === t.type
                ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500 hover:text-stone-200'
              }
            `}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-xs font-medium leading-none">{t.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border leading-none ${RELIABILITY_CLASSES[t.reliability]}`}>
              {RELIABILITY_LABELS[t.reliability]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
