import { Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { DetectedItem, PriceMap } from '../types';

interface Props {
  priceMap: PriceMap;
  divinePrice: number;
  onAddItems: (items: DetectedItem[]) => void;
}

interface ManualEntry {
  name: string;
  quantity: number;
}

export function ManualInput({ priceMap, divinePrice, onAddItems }: Props) {
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const allNames = useMemo(() => Object.keys(priceMap).sort(), [priceMap]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 10);
  }, [query, allNames]);

  const addEntry = useCallback((name: string) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.name === name);
      if (existing) return prev.map((e) => e.name === name ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { name, quantity: 1 }];
    });
    setQuery('');
    setShowSuggestions(false);
  }, []);

  const removeEntry = useCallback((name: string) => {
    setEntries((prev) => prev.filter((e) => e.name !== name));
  }, []);

  const updateQty = useCallback((name: string, qty: number) => {
    if (qty <= 0) {
      removeEntry(name);
      return;
    }
    setEntries((prev) => prev.map((e) => e.name === name ? { ...e, quantity: qty } : e));
  }, [removeEntry]);

  const handleApply = () => {
    const items: DetectedItem[] = entries
      .filter((e) => priceMap[e.name])
      .map((e) => {
        const price = priceMap[e.name];
        const unitChaos = price.chaosValue;
        const unitDivine = price.divineValue > 0 ? price.divineValue : unitChaos / divinePrice;
        return {
          id: `manual-${e.name}`,
          name: e.name,
          quantity: e.quantity,
          chaosValue: unitChaos * e.quantity,
          divineValue: unitDivine * e.quantity,
          icon: price.icon,
          confidence: 1,
        };
      });
    onAddItems(items);
    setEntries([]);
  };

  const totalDivines = entries.reduce((s, e) => {
    const p = priceMap[e.name];
    if (!p) return s;
    const div = p.divineValue > 0 ? p.divineValue : p.chaosValue / divinePrice;
    return s + div * e.quantity;
  }, 0);

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/50"
            placeholder="Search items to add manually…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden shadow-xl">
              {suggestions.map((name) => (
                <button
                  key={name}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 text-left transition-colors"
                  onMouseDown={() => addEntry(name)}
                >
                  {priceMap[name]?.icon && (
                    <img src={priceMap[name].icon} alt="" className="w-5 h-5 object-contain" />
                  )}
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleApply}
          disabled={entries.length === 0}
        >
          <Plus className="w-4 h-4" />
          Add to results
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((e) => {
            const price = priceMap[e.name];
            const unitDiv = price
              ? (price.divineValue > 0 ? price.divineValue : price.chaosValue / divinePrice)
              : 0;
            return (
              <div key={e.name} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-stone-800/50">
                {price?.icon && (
                  <img src={price.icon} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                )}
                <span className="flex-1 text-sm text-stone-300 truncate">{e.name}</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 text-right text-sm bg-stone-800 border border-stone-700 rounded px-2 py-0.5 text-stone-200 focus:outline-none focus:border-amber-500/50"
                  value={e.quantity}
                  onChange={(v) => updateQty(e.name, parseInt(v.target.value, 10))}
                />
                <span className="text-xs text-amber-400 w-20 text-right">
                  {(unitDiv * e.quantity).toFixed(2)} div
                </span>
                <button onClick={() => removeEntry(e.name)} className="text-stone-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          <div className="text-right text-xs text-amber-400 pt-1 border-t border-stone-800">
            Subtotal: {totalDivines.toFixed(2)} div
          </div>
        </div>
      )}
    </div>
  );
}
