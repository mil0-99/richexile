import { Settings } from 'lucide-react';
import { useState } from 'react';
import type { GridConfig } from '../services/imageProcessor';

interface Props {
  config: GridConfig;
  onChange: (config: GridConfig) => void;
  imageWidth: number;
  imageHeight: number;
}

export function GridCalibration({ config, onChange, imageWidth, imageHeight }: Props) {
  const [open, setOpen] = useState(false);

  const update = (key: keyof GridConfig, val: number) => {
    onChange({ ...config, [key]: val });
  };

  return (
    <div>
      <button
        className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <Settings className="w-3.5 h-3.5" />
        Adjust grid calibration
      </button>

      {open && (
        <div className="mt-3 p-4 rounded-lg border border-stone-700 bg-stone-900 grid grid-cols-2 gap-4 text-sm">
          <p className="col-span-2 text-xs text-stone-500">
            If detection is off, adjust the grid to match your stash tab layout.
            Image size: {imageWidth}×{imageHeight}px.
          </p>

          {(
            [
              { key: 'startX', label: 'Start X', min: 0, max: imageWidth },
              { key: 'startY', label: 'Start Y', min: 0, max: imageHeight },
              { key: 'cellW',  label: 'Cell width',  min: 20, max: 120 },
              { key: 'cellH',  label: 'Cell height', min: 20, max: 120 },
              { key: 'cols',   label: 'Columns', min: 1, max: 20 },
              { key: 'rows',   label: 'Rows',    min: 1, max: 20 },
            ] as { key: keyof GridConfig; label: string; min: number; max: number }[]
          ).map(({ key, label, min, max }) => (
            <div key={key}>
              <label className="block text-xs text-stone-500 mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={config[key]}
                  onChange={(e) => update(key, parseInt(e.target.value, 10))}
                  className="flex-1 accent-amber-500"
                />
                <span className="w-10 text-right text-stone-300 font-mono text-xs">{config[key]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
