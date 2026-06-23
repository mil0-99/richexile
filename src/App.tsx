import { useCallback, useEffect, useRef, useState } from 'react';
import { GridCalibration } from './components/GridCalibration';
import { Header } from './components/Header';
import { ManualInput } from './components/ManualInput';
import { Results } from './components/Results';
import { TabTypeSelector } from './components/TabTypeSelector';
import { UploadArea } from './components/UploadArea';
import { useLeagues } from './hooks/useLeagues';
import { usePrices } from './hooks/usePrices';
import { autoDetectGrid, processScreenshot, type GridConfig } from './services/imageProcessor';
import type { DetectedItem, TabType } from './types';

type AppState = 'setup' | 'processing' | 'results';

export default function App() {
  const { leagues, selected: selectedLeague, setSelected: setLeague, loading: leaguesLoading } = useLeagues();
  const { map: priceMap, divinePrice, loading: pricesLoading, error: pricesError, progress: pricesProgress, loadPrices } = usePrices();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tabType, setTabType] = useState<TabType | null>(null);
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
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    // Get image dimensions for grid calibration
    const img = new Image();
    img.onload = () => {
      setImageSize({ w: img.width, h: img.height });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const grid = autoDetectGrid(imageData);
      setGridConfig(grid);
    };
    img.src = url;
  }, []);

  const handleClearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setGridConfig(null);
    setImageSize({ w: 0, h: 0 });
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
    setAppState('setup');
    setTabType(null);
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

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Header
        leagues={leagues}
        selectedLeague={selectedLeague}
        onLeagueChange={setLeague}
        leaguesLoading={leaguesLoading}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        {appState === 'setup' && items.length === 0 && (
          <div className="text-center py-6">
            <h2 className="text-2xl font-bold text-amber-300 mb-2">Value your PoE2 stash</h2>
            <p className="text-stone-400 text-sm max-w-lg mx-auto">
              Upload a screenshot of any stash tab. Rich Exile will detect items and calculate their
              value in divines using live poe.ninja prices — no stash API needed.
            </p>
          </div>
        )}

        {/* Setup / Upload flow */}
        {(appState === 'setup' || appState === 'processing') && (
          <div className="space-y-6">

            {/* Step 1: Tab type — always visible */}
            <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
                <h3 className="text-sm font-semibold text-stone-200">Select stash tab type</h3>
              </div>
              <TabTypeSelector selected={tabType} onChange={setTabType} />
            </section>

            {/* Step 2: Upload + Analyse — only shown once tab type is picked */}
            {tabType && (
              <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
                    <h3 className="text-sm font-semibold text-stone-200">Upload screenshot</h3>
                  </div>
                  {tabType === 'quad' && (
                    <p className="text-xs text-stone-500">Partial screenshots supported</p>
                  )}
                </div>

                <UploadArea file={file} previewUrl={previewUrl} onFile={handleFile} onClear={handleClearFile} />

                {/* Grid calibration */}
                {file && gridConfig && (tabType === 'currency' || tabType === 'essence' || tabType === 'omen' || tabType === 'rune' || tabType === 'fragment') && (
                  <GridCalibration
                    config={gridConfig}
                    onChange={setGridConfig}
                    imageWidth={imageSize.w}
                    imageHeight={imageSize.h}
                  />
                )}

                {/* Price loading indicator */}
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
                  <p className="text-xs text-red-400">Failed to load prices: {pricesError}</p>
                )}

                {/* Analyse button — the primary CTA */}
                {appState === 'setup' && (
                  <button
                    className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all
                      bg-amber-600 hover:bg-amber-500 text-white
                      disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed"
                    onClick={handleAnalyse}
                    disabled={!canAnalyse}
                  >
                    {!file
                      ? 'Upload a screenshot to continue'
                      : pricesLoading
                      ? 'Loading price data…'
                      : Object.keys(priceMap).length === 0
                      ? 'No price data — try switching league'
                      : 'Analyse Screenshot →'}
                  </button>
                )}

                {Object.keys(priceMap).length > 0 && !pricesLoading && (
                  <p className="text-center text-xs text-stone-600">
                    {Object.keys(priceMap).length} items priced · {selectedLeague?.id}
                  </p>
                )}
              </section>
            )}

            {/* Processing state */}
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
                <p className="text-xs text-stone-600">
                  Template matching may take 10–30 seconds for large tabs
                </p>
              </div>
            )}
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

        {/* Manual input — always available when prices are loaded */}
        {Object.keys(priceMap).length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs text-stone-500 uppercase tracking-wider">
              Manual item input
              <span className="ml-2 text-stone-600 normal-case">
                — useful for uniques, gems, or items not detected by the scanner
              </span>
            </h3>
            <ManualInput
              priceMap={priceMap}
              divinePrice={divinePrice}
              onAddItems={handleAddItems}
            />
          </section>
        )}

        {/* Tips section */}
        {appState === 'setup' && (
          <section className="rounded-xl border border-stone-800 bg-stone-900/30 p-5 space-y-3">
            <h3 className="text-xs text-stone-500 uppercase tracking-wider">Tips for better results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-400">
              <div className="flex gap-2">
                <span className="text-amber-500">💰</span>
                <span><strong className="text-stone-300">Currency / Essence / Omen tabs</strong> work best — fixed grid layouts allow reliable icon matching.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500">📦</span>
                <span><strong className="text-stone-300">Quad tabs</strong> — partial screenshots of specific regions are supported and preferred.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500">🖥️</span>
                <span>Take screenshots at your native resolution without cropping for best icon match accuracy.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500">✏️</span>
                <span>All detected quantities are editable — click any number to correct misidentifications.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500">⚔️</span>
                <span><strong className="text-stone-300">Unique / Gem tabs</strong> — use manual input below since icons are too similar to distinguish reliably.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500">📊</span>
                <span>Prices are sourced from poe.ninja and refresh automatically when you switch leagues.</span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-stone-800/50 text-center py-6 text-xs text-stone-600">
        <p>
          Rich Exile is not affiliated with Grinding Gear Games.
          Prices sourced from <a href="https://poe.ninja" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-amber-400 transition-colors">poe.ninja</a>.
        </p>
      </footer>
    </div>
  );
}
