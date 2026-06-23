import { AlertTriangle, RotateCcw, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { DetectedItem } from '../types';
import { ItemRow } from './ItemRow';

interface Props {
  items: DetectedItem[];
  divinePrice: number;
  onReset: () => void;
  onQuantityChange: (id: string, qty: number) => void;
}

export function Results({ items, divinePrice, onReset, onQuantityChange }: Props) {
  const [currency, setCurrency] = useState<'divine' | 'chaos'>('divine');

  const totalDivines = items.reduce((s, i) => s + i.divineValue, 0);
  const totalChaos = items.reduce((s, i) => s + i.chaosValue, 0);

  const highConfidence = items.filter((i) => i.confidence >= 0.7);
  const lowConfidence = items.filter((i) => i.confidence < 0.7);

  const displayTotal = currency === 'divine' ? totalDivines : totalChaos;
  const displayUnit = currency === 'divine' ? 'div' : 'c';

  return (
    <div className="space-y-4">
      {/* Total summary */}
      <div className="rounded-xl border border-amber-700/40 bg-gradient-to-br from-amber-950/40 to-stone-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Estimated value</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-amber-300">
                {displayTotal.toFixed(1)}
              </span>
              <span className="text-xl text-amber-500/70">{displayUnit}</span>
            </div>
            {currency === 'divine' && (
              <p className="text-xs text-stone-500 mt-1">
                ≈ {totalChaos.toFixed(0)} chaos &nbsp;·&nbsp; 1 div = {divinePrice.toFixed(0)}c
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex rounded-lg border border-stone-700 overflow-hidden text-xs">
              {(['divine', 'chaos'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    currency === c
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {c === 'divine' ? 'Divines' : 'Chaos'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500">
              <TrendingUp className="w-3.5 h-3.5" />
              {items.length} item type{items.length !== 1 ? 's' : ''} detected
            </div>
          </div>
        </div>
      </div>

      {/* Low confidence warning */}
      {lowConfidence.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-700/30 bg-amber-900/10 text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Some items have low confidence</p>
            <p className="text-amber-500/70 mt-0.5">
              {lowConfidence.length} detection{lowConfidence.length !== 1 ? 's' : ''} below 70% confidence.
              Adjust quantities manually if needed.
            </p>
          </div>
        </div>
      )}

      {/* Item list */}
      {items.length === 0 ? (
        <div className="text-center py-10 text-stone-500 text-sm">
          <p>No items detected.</p>
          <p className="mt-1 text-xs text-stone-600">
            Try adjusting the grid settings or use manual input below.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-800 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-[11px] text-stone-500 uppercase tracking-wider px-4 py-2 border-b border-stone-800 bg-stone-900/50">
            <span className="col-span-2">Item</span>
            <span className="text-right pr-4">Qty</span>
            <span className="text-right pr-4">Value/ea</span>
            <span className="text-right">Total</span>
          </div>

          {highConfidence.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              currency={currency}
              onQuantityChange={onQuantityChange}
            />
          ))}

          {lowConfidence.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[11px] text-stone-600 uppercase tracking-wider bg-stone-900/30 border-t border-stone-800">
                Low confidence
              </div>
              {lowConfidence.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onQuantityChange={onQuantityChange}
                />
              ))}
            </>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-700 text-sm text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Start over
      </button>
    </div>
  );
}
