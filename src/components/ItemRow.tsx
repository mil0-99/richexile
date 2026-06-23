import { useState } from 'react';
import type { DetectedItem } from '../types';

interface Props {
  item: DetectedItem;
  currency: 'divine' | 'chaos';
  onQuantityChange: (id: string, qty: number) => void;
}

export function ItemRow({ item, currency, onQuantityChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(item.quantity));

  const unitValue = currency === 'divine' ? item.divineValue / item.quantity : item.chaosValue / item.quantity;
  const totalValue = currency === 'divine' ? item.divineValue : item.chaosValue;
  const unit = currency === 'divine' ? 'div' : 'c';

  const handleBlur = () => {
    setEditing(false);
    const qty = parseInt(inputVal, 10);
    if (!isNaN(qty) && qty >= 0) {
      onQuantityChange(item.id, qty);
    } else {
      setInputVal(String(item.quantity));
    }
  };

  const confidencePct = Math.round(item.confidence * 100);

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-2.5 border-b border-stone-800/50 hover:bg-stone-900/30 transition-colors group">
      {/* Icon */}
      <div className="mr-3 flex-shrink-0">
        {item.icon ? (
          <img
            src={item.icon}
            alt={item.name}
            className="w-8 h-8 object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-stone-800" />
        )}
      </div>

      {/* Name + confidence */}
      <div className="min-w-0">
        <p className="text-sm text-stone-200 truncate">{item.name}</p>
        <p className="text-[11px] text-stone-600 mt-0.5">
          {confidencePct}% confidence
        </p>
      </div>

      {/* Quantity */}
      <div className="pr-4">
        {editing ? (
          <input
            className="w-16 text-right text-sm bg-stone-800 border border-amber-500/50 rounded px-2 py-0.5 text-amber-300 focus:outline-none"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
          />
        ) : (
          <button
            className="w-16 text-right text-sm text-stone-300 hover:text-amber-300 transition-colors font-mono cursor-text"
            onClick={() => { setEditing(true); setInputVal(String(item.quantity)); }}
          >
            ×{item.quantity.toLocaleString()}
          </button>
        )}
      </div>

      {/* Unit value */}
      <div className="pr-4 text-right">
        <span className="text-sm text-stone-400 font-mono">
          {unitValue >= 0.01 ? unitValue.toFixed(2) : '<0.01'}
        </span>
        <span className="text-xs text-stone-600 ml-1">{unit}</span>
      </div>

      {/* Total */}
      <div className="text-right">
        <span className={`text-sm font-semibold font-mono ${
          totalValue >= 10 ? 'text-amber-300' :
          totalValue >= 1 ? 'text-stone-200' :
          'text-stone-500'
        }`}>
          {totalValue >= 100 ? totalValue.toFixed(1) : totalValue.toFixed(2)}
        </span>
        <span className="text-xs text-stone-600 ml-1">{unit}</span>
      </div>
    </div>
  );
}
