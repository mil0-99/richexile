import { createWorker } from 'tesseract.js';
import type { GridConfig } from './imageProcessor';
import type { TabType } from '../types';

export interface DetectionResult {
  tabType: TabType | null;
  gridConfig: GridConfig | null;
  rawText: string;
  confidence: number;
}

const TAB_KEYWORDS: { keywords: RegExp; type: TabType }[] = [
  { keywords: /\bcurrency\b/i,                          type: 'currency'  },
  { keywords: /\bessence\b/i,                           type: 'essence'   },
  { keywords: /\bomen\b/i,                              type: 'omen'      },
  { keywords: /\brune/i,                                type: 'rune'      },
  { keywords: /\bfrag|\bscarab/i,                       type: 'fragment'  },
  { keywords: /\bunique\b/i,                            type: 'unique'    },
  { keywords: /\bgem\b/i,                               type: 'gem'       },
  { keywords: /\bquad\b/i,                              type: 'quad'      },
];

// Columns per tab type at 100% UI scale
const TAB_COLS: Partial<Record<TabType, number>> = {
  currency:  12,
  essence:   10,
  omen:      10,
  rune:      10,
  fragment:  10,
  quad:      24,
  unique:    12,
  gem:       12,
  other:     12,
};

export async function detectStashTab(
  file: File,
  imageWidth: number,
  imageHeight: number,
  onProgress?: (stage: string, pct: number) => void
): Promise<DetectionResult> {
  onProgress?.('Loading OCR engine…', 0);

  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
        onProgress?.('Loading OCR engine…', m.progress * 40);
      } else if (m.status === 'loading language traineddata') {
        onProgress?.('Loading language data…', 40 + m.progress * 30);
      } else if (m.status === 'recognizing text') {
        onProgress?.('Reading text from screenshot…', 70 + m.progress * 30);
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    const rawText = data.text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const words: any[] = (data as any).words ?? [];

    // ── Tab type detection ──────────────────────────────────────────────────
    let tabType: TabType | null = null;
    let confidence = 0;

    for (const { keywords, type } of TAB_KEYWORDS) {
      if (keywords.test(rawText)) {
        tabType = type;
        confidence = 0.85;
        break;
      }
    }

    // ── Stash panel location from OCR word bounding boxes ───────────────────
    let gridConfig: GridConfig | null = null;

    // Find "STASH" title word — it's the anchor for the panel
    const stashWord = words.find(
      (w: { text: string }) => /^stash$/i.test(w.text.trim())
    );

    if (stashWord) {
      const sb = (stashWord as { bbox: { x0: number; y0: number; x1: number; y1: number } }).bbox;

      // Tab bar: find any word that matches a tab keyword near the same vertical band
      const nearbyWords = words.filter((w: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }) => {
        return Math.abs(w.bbox.y0 - sb.y0) < imageHeight * 0.08;
      });

      const tabBarBottom = nearbyWords.length > 0
        ? Math.max(...nearbyWords.map((w: { bbox: { y1: number } }) => w.bbox.y1))
        : sb.y1 + 20;

      // Panel left edge: slightly to the left of the "STASH" label
      const panelLeft = Math.max(0, sb.x0 - 20);

      // Grid starts just below tab bar
      const gridTop = tabBarBottom + 4;

      // Panel width: from panelLeft to image right edge, with a small margin
      const panelWidth = imageWidth - panelLeft - 10;

      // Estimate cell size from the panel width and expected column count
      const expectedCols = (tabType && TAB_COLS[tabType]) ?? 12;
      const cellSize = Math.max(24, Math.min(80, Math.floor(panelWidth / expectedCols)));

      const cols = Math.min(Math.floor(panelWidth / cellSize), expectedCols);
      const rows = Math.min(Math.floor((imageHeight - gridTop) / cellSize), 16);

      gridConfig = {
        startX: panelLeft,
        startY: gridTop,
        cellW: cellSize,
        cellH: cellSize,
        cols: Math.max(1, cols),
        rows: Math.max(1, rows),
      };
    } else if (tabType) {
      // STASH title not found — fall back to proportion-based detection
      // but use image aspect ratio to estimate scale better
      const scale = imageWidth / 2560;
      const cellSize = Math.round(Math.max(24, Math.min(80, 47 * scale * 2)));
      const panelWidth = Math.round(imageWidth * 0.38);
      const panelLeft = imageWidth - panelWidth;
      const gridTop = Math.round(imageHeight * 0.13);
      const expectedCols = TAB_COLS[tabType] ?? 12;

      gridConfig = {
        startX: panelLeft,
        startY: gridTop,
        cellW: cellSize,
        cellH: cellSize,
        cols: Math.min(expectedCols, Math.floor(panelWidth / cellSize)),
        rows: Math.min(16, Math.floor((imageHeight - gridTop) / cellSize)),
      };
    }

    return { tabType, gridConfig, rawText, confidence };
  } finally {
    await worker.terminate();
  }
}
