import { useCallback, useEffect, useRef, useState } from 'react';
import { GridCalibration } from './components/GridCalibration';
import { Header } from './components/Header';
import { ManualInput } from './components/ManualInput';
import { Results } from './components/Results';
import { TabTypeSelector } from './components/TabTypeSelector';
import { UploadArea } from './components/UploadArea';
import { useLeagues } from './hooks/useLeagues';
import { usePrices } from './hooks/usePrices';
import { processScreenshot, type GridConfig } from './services/imageProcessor';
import { detectStashTab } from './services/tabDetector';
import type { DetectedItem, TabType } from './types';

type AppState = 'setup' | 'detecting' | 'processing' | 'results';

export default function App() {
  const { leagues, selected: selectedLeague, setSelected: setLeague, loading: leaguesLoading } = useLeagues();
  const { map: priceMap, divinePrice, loading: pricesLoading, error: pricesError, progress: pricesProgress, loadPrices } = usePrices();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tabType, setTabType] = useState<TabType | null>(null);
  const [detectedType, setDetectedType] = useState<TabType | null>(null);
  const [appState, setAppState] = useState<AppState>('setup');
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [gridConfig, setGridConfig] = useState<GridConfig | null>(null);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const prevLeagueTabRef = useRef<string>('');

  // Load prices when league or tab type changes
  useEffect(() => {
    if (!selectedLeague || !tabType) return;
    const key = `${selectedLeague.id}:${tabType}`;
    if (key === prevLeagueTabRef.current) return;
    prevLeagueTabRef.current = key;
    loadPrices(selectedLeague.id, tabType);
  }, [selectedLeague, tabType, loadPrices]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setDetectedType(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      setImageSize({ w, h });

      // Auto-detect tab type + stash bounds via OCR
      setAppState('detecting');
      setProcessingStage('Scanning screenshot…');
      setProcessingProgress(0);

      detectStashTab(f, w, h, (stage, pct) => {
        setProcessingStage(stage);
        setProcessingProgress(pct);
      }).then((result) => {
        if (result.tabType) {
          setDetectedType(result.tabType);
          setTabType(result.tabType);
        }
        if (result.gridConfig) {
          setGridConfig(result.gridConfig);
        }
        setAppState('setup');
      }).catch(() => {
        setAppState('setup');
      });
    };
    img.src = url;
  }, []);

  const handleClearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setGridConfig(null);
    setImageSize({ w: 0, h: 0 });
    setDetectedType(null);
    setTabType(null);
    setAppState('setup');
  }, [previewUrl]);

  const handleAnalyse = useCallback(async () => {
    if (!file || !tabType || Object.keys(priceMap).length === 0) return;

    setAppState('processing');
    setProcessingProgress(0);
    setProcessingStage('Starting…');

    try {
      const detected = await processScreenshot(
        file,
        tabType,
        priceMap,
        divinePrice,
        (stage, pct) => {
          setProcessingStage(stage);
          setProcessingProgress(pct);
        }
      );

      setItems(detected);
      setAppState('results');
    } catch (e) {
      console.error('Processing error:', e);
      setAppState('setup');
    }
  }, [file, tabType, priceMap, divinePrice]);

  const handleReset = useCallback(() => {
    handleClearFile();
    setItems([]);
  }, [handleClearFile]);

  const handleQuantityChange = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const unitChaos = item.chaosValue / item.quantity;
        const unitDivine = item.divineValue / item.quantity;
        return {
          ...item,
          quantity: qty,
          chaosValue: unitChaos * qty,
          divineValue: unitDivine * qty,
        };
      })
    );
  }, []);

  const handleAddItems = useCallback((newItems: DetectedItem[]) => {
    setItems((prev) => {
      const merged = [...prev];
      for (const ni of newItems) {
        const idx = merged.findIndex((i) => i.name === ni.name);
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            quantity: merged[idx].quantity + ni.quantity,
            chaosValue: merged[idx].chaosValue + ni.chaosValue,
            divineValue: merged[idx].divineValue + ni.divineValue,
          };
        } else {
          merged.push(ni);
        }
      }
      return merged.sort((a, b) => b.divineValue - a.divineValue);
    });
    if (appState === 'setup') setAppState('results');
  }, [appState]);

  const canAnalyse = file !== null && tabType !== null && !pricesLoading && Object.keys(priceMap).length > 0;
  const isDetecting = appState === 'detecting';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Header
        leagues={leagues}
        selectedLeague={selectedLeague}
        onLeagueChange={setLeague}
        leaguesLoading={leaguesLoading}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        {appState === 'setup' && !file && (
          <div className="text-center py-4">
            <h2 className="text-2xl font-bold text-amber-300 mb-2">Value your PoE2 stash</h2>
            <p className="text-stone-400 text-sm max-w-lg mx-auto">
              Upload a screenshot — Rich Exile will detect the tab type automatically and price everything using live poe.ninja data.
            </p>
          </div>
        )}

        {/* Results */}
        {appState === 'results' && (
          <Results
            items={items}
            divinePrice={divinePrice}
            onReset={handleReset}
            onQuantityChange={handleQuantityChange}
          />
        )}

        {/* Setup / Detection / Processing */}
        {(appState === 'setup' || appState === 'detecting' || appState === 'processing') && (
          <div className="space-y-5">

            {/* Upload — always first, no gating */}
            <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-stone-200">Upload screenshot</h3>
              <UploadArea file={file} previewUrl={previewUrl} onFile={handleFile} onClear={handleClearFile} />

              {/* OCR detection progress */}
              {isDetecting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <span>{processingStage}</span>
                  </div>
                  <div className="h-1 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-600 transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Detection result badge */}
              {detectedType && !isDetecting && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                    Auto-detected: {detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} tab
                  </span>
                  <span className="text-stone-600">— change below if wrong</span>
                </div>
              )}
            </section>

            {/* Tab type selector — shown after upload, pre-filled if detected */}
            {file && !isDetecting && (
              <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-200">
                    {detectedType ? 'Confirm tab type' : 'Select tab type'}
                  </h3>
                  {tabType && gridConfig && (
                    <GridCalibration
                      config={gridConfig}
                      onChange={setGridConfig}
                      imageWidth={imageSize.w}
                      imageHeight={imageSize.h}
                    />
                  )}
                </div>
                <TabTypeSelector selected={tabType} onChange={setTabType} />

                {/* Price loading bar */}
                {selectedLeague && pricesLoading && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex-1 h-1 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-600 transition-all duration-300"
                        style={{ width: `${pricesProgress}%` }}
                      />
                    </div>
                    <span className="text-stone-500 whitespace-nowrap">Loading prices…</span>
                  </div>
                )}
                {pricesError && (
                  <p className="text-xs text-red-400">Price load failed: {pricesError}</p>
                )}

                {/* Analyse button — inside this section so it's always visible */}
                {appState === 'setup' && tabType && (
                  <button
                    className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all
                      bg-amber-600 hover:bg-amber-500 text-white
                      disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed"
                    onClick={handleAnalyse}
                    disabled={!canAnalyse}
                  >
                    {pricesLoading
                      ? 'Loading price data…'
                      : Object.keys(priceMap).length === 0
                      ? 'No price data — try switching league'
                      : 'Analyse Screenshot →'}
                  </button>
                )}

                {Object.keys(priceMap).length > 0 && !pricesLoading && tabType && (
                  <p className="text-center text-xs text-stone-600">
                    {Object.keys(priceMap).length} items priced · {selectedLeague?.id}
                  </p>
                )}
              </section>
            )}

            {/* Processing progress */}
            {appState === 'processing' && (
              <div className="rounded-xl border border-stone-800 bg-stone-900 p-6 text-center space-y-3">
                <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-stone-300 font-medium">{processingStage}</p>
                <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-stone-600">Template matching may take 10–30s for large tabs</p>
              </div>
            )}

            {/* Tips — only before upload */}
            {!file && (
              <section className="rounded-xl border border-stone-800 bg-stone-900/30 p-5 space-y-3">
                <h3 className="text-xs text-stone-500 uppercase tracking-wider">Tips</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-400">
                  <div className="flex gap-2"><span className="text-amber-500">💰</span><span><strong className="text-stone-300">Currency / Essence / Omen / Rune tabs</strong> work best — fixed grid layout.</span></div>
                  <div className="flex gap-2"><span className="text-amber-500">📦</span><span><strong className="text-stone-300">Quad tabs</strong> — partial screenshots work. Just crop to the region you want valued.</span></div>
                  <div className="flex gap-2"><span className="text-amber-500">🖥️</span><span>Screenshot the full game window at native resolution for best detection accuracy.</span></div>
                  <div className="flex gap-2"><span className="text-amber-500">✏️</span><span>All detected quantities are editable — click any number to correct mistakes.</span></div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Manual input — always available when prices are loaded */}
        {Object.keys(priceMap).length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs text-stone-500 uppercase tracking-wider">
              Manual item input
              <span className="ml-2 text-stone-600 normal-case">— for uniques, gems, or correction</span>
            </h3>
            <ManualInput
              priceMap={priceMap}
              divinePrice={divinePrice}
              onAddItems={handleAddItems}
            />
          </section>
        )}
      </main>

      <footer className="border-t border-stone-800/50 text-center py-6 text-xs text-stone-600">
        <p>
          Rich Exile is not affiliated with Grinding Gear Games.
          Prices from <a href="https://poe.ninja" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-amber-400 transition-colors">poe.ninja</a>.
        </p>
      </footer>
    </div>
  );
}
