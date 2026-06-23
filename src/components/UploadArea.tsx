import { ImageIcon, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  file: File | null;
  onClear: () => void;
  previewUrl: string | null;
}

export function UploadArea({ onFile, file, onClear, previewUrl }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) onFile(f);
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onFile(f);
      e.target.value = '';
    },
    [onFile]
  );

  if (file && previewUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-stone-700 bg-stone-900">
        <img
          src={previewUrl}
          alt="Screenshot preview"
          className="w-full max-h-72 object-contain bg-stone-950"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/90 border border-stone-600 text-xs text-stone-300 hover:border-amber-500/50 transition-colors backdrop-blur-sm">
            <Upload className="w-3.5 h-3.5" />
            Replace
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
          </label>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/90 border border-stone-600 text-xs text-stone-400 hover:text-red-400 hover:border-red-900/50 transition-colors backdrop-blur-sm"
            onClick={onClear}
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-stone-950/80 backdrop-blur-sm text-xs text-stone-400 truncate">
          {file.name} — {(file.size / 1024).toFixed(0)} KB
        </div>
      </div>
    );
  }

  return (
    <label
      className={`
        flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all
        ${dragging
          ? 'border-amber-500 bg-amber-500/5'
          : 'border-stone-700 hover:border-amber-600/50 bg-stone-900/50 hover:bg-stone-900'
        }
      `}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="w-14 h-14 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center">
        {dragging ? (
          <ImageIcon className="w-7 h-7 text-amber-400" />
        ) : (
          <Upload className="w-7 h-7 text-stone-500" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-stone-300">
          {dragging ? 'Drop your screenshot' : 'Upload a stash tab screenshot'}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          PNG, JPG, WebP — drag & drop or click to browse
        </p>
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </label>
  );
}
