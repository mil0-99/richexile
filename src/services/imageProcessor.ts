import type { DetectedItem, PriceMap, TabType } from '../types';

// Load an image from a URL onto a canvas, returning pixel data
async function loadImageData(
  url: string,
  targetW: number,
  targetH: number
): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, targetW, targetH);
      try {
        resolve(ctx.getImageData(0, 0, targetW, targetH));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Normalised sum of absolute differences (0 = identical, 1 = totally different)
function computeNSAD(
  src: ImageData,
  tpl: ImageData,
  sx: number,
  sy: number
): number {
  const tw = tpl.width;
  const th = tpl.height;
  let sad = 0;
  let count = 0;

  for (let y = 0; y < th; y++) {
    const srcY = sy + y;
    if (srcY < 0 || srcY >= src.height) continue;
    for (let x = 0; x < tw; x++) {
      const srcX = sx + x;
      if (srcX < 0 || srcX >= src.width) continue;

      const si = (srcY * src.width + srcX) * 4;
      const ti = (y * tw + x) * 4;

      // Skip near-transparent template pixels
      if (tpl.data[ti + 3] < 32) continue;

      sad += Math.abs(src.data[si] - tpl.data[ti]);
      sad += Math.abs(src.data[si + 1] - tpl.data[ti + 1]);
      sad += Math.abs(src.data[si + 2] - tpl.data[ti + 2]);
      count += 3;
    }
  }

  return count === 0 ? 1 : sad / (count * 255);
}

// Slide a template over the source image; return best match position and score
function templateMatch(
  src: ImageData,
  tpl: ImageData,
  stepX = 4,
  stepY = 4
): { x: number; y: number; score: number } {
  let best = { x: 0, y: 0, score: 1 };
  const maxX = src.width - tpl.width;
  const maxY = src.height - tpl.height;

  for (let y = 0; y <= maxY; y += stepY) {
    for (let x = 0; x <= maxX; x += stepX) {
      const score = computeNSAD(src, tpl, x, y);
      if (score < best.score) {
        best = { x, y, score };
      }
    }
  }

  return best;
}


export interface GridConfig {
  startX: number;
  startY: number;
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
}

// Detect a likely currency-tab grid by looking for regular icon patterns
export function autoDetectGrid(imageData: ImageData): GridConfig | null {
  const { width, height } = imageData;

  // Look for alternating dark/lighter bands (icon rows)
  // Very simplified: assume standard PoE2 layout at ~1920x1080
  const scale = width / 1920;
  const cellSize = Math.round(47 * scale);
  const startX = Math.round(width * 0.62); // stash panel typically in right ~38% of screen
  const startY = Math.round(height * 0.12);
  const cols = Math.floor((width * 0.36) / cellSize);
  const rows = Math.floor((height * 0.75) / cellSize);

  if (cols < 2 || rows < 2) return null;

  return {
    startX,
    startY,
    cellW: cellSize,
    cellH: cellSize,
    cols: Math.min(cols, 13),
    rows: Math.min(rows, 12),
  };
}

interface MatchEntry {
  name: string;
  icon: string;
  tplData: ImageData;
  chaosValue: number;
  divineValue: number;
}

// Resize a blob/url image for fast matching
const TEMPLATE_SIZE = 40;

export async function buildTemplateCache(
  priceMap: PriceMap,
  onProgress?: (pct: number) => void
): Promise<MatchEntry[]> {
  const entries = Object.entries(priceMap).filter(([, v]) => v.icon);
  const result: MatchEntry[] = [];
  let done = 0;

  // Load in batches to avoid overwhelming the browser
  const BATCH = 20;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ([name, val]) => {
        const data = await loadImageData(val.icon, TEMPLATE_SIZE, TEMPLATE_SIZE);
        if (data) {
          result.push({
            name,
            icon: val.icon,
            tplData: data,
            chaosValue: val.chaosValue,
            divineValue: val.divineValue,
          });
        }
      })
    );
    done += batch.length;
    onProgress?.((done / entries.length) * 100);
    // Yield to browser
    await new Promise((r) => setTimeout(r, 0));
  }

  return result;
}

// Main grid-based detection for structured tabs (currency, essence, omen)
export async function detectItemsInGrid(
  imageData: ImageData,
  templates: MatchEntry[],
  grid: GridConfig,
  divinePrice: number,
  onProgress?: (pct: number) => void
): Promise<DetectedItem[]> {
  const detected: DetectedItem[] = [];
  const totalCells = grid.cols * grid.rows;
  let done = 0;
  const MATCH_THRESHOLD = 0.35; // lower = stricter

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cellX = grid.startX + col * grid.cellW;
      const cellY = grid.startY + row * grid.cellH;

      // Extract cell
      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = TEMPLATE_SIZE;
      cellCanvas.height = TEMPLATE_SIZE;
      const cellCtx = cellCanvas.getContext('2d')!;

      // Draw just the cell portion from a temporary canvas
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = imageData.width;
      tmpCanvas.height = imageData.height;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.putImageData(imageData, 0, 0);
      cellCtx.drawImage(
        tmpCanvas,
        cellX, cellY, grid.cellW, grid.cellH,
        0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE
      );

      const cellData = cellCtx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);

      // Check if cell appears empty (mostly dark)
      let totalBrightness = 0;
      for (let i = 0; i < cellData.data.length; i += 4) {
        totalBrightness += (cellData.data[i] + cellData.data[i + 1] + cellData.data[i + 2]) / 3;
      }
      const avgBrightness = totalBrightness / (cellData.data.length / 4);
      if (avgBrightness < 12) {
        done++;
        onProgress?.((done / totalCells) * 100);
        continue;
      }

      // Find best matching template
      let bestScore = 1;
      let bestTemplate: MatchEntry | null = null;

      for (const tpl of templates) {
        const score = computeNSAD(cellData, tpl.tplData, 0, 0);
        if (score < bestScore) {
          bestScore = score;
          bestTemplate = tpl;
        }
      }

      if (bestTemplate && bestScore < MATCH_THRESHOLD) {
        // Try to find if this item was already detected nearby (dedup)
        const existing = detected.find((d) => d.name === bestTemplate!.name);
        if (existing) {
          existing.quantity += 1;
          existing.chaosValue += bestTemplate.chaosValue;
          existing.divineValue += bestTemplate.divineValue > 0
            ? bestTemplate.divineValue
            : bestTemplate.chaosValue / divinePrice;
        } else {
          detected.push({
            id: `${bestTemplate.name}-${col}-${row}`,
            name: bestTemplate.name,
            quantity: 1,
            chaosValue: bestTemplate.chaosValue,
            divineValue: bestTemplate.divineValue > 0
              ? bestTemplate.divineValue
              : bestTemplate.chaosValue / divinePrice,
            icon: bestTemplate.icon,
            confidence: 1 - bestScore,
            x: cellX,
            y: cellY,
            width: grid.cellW,
            height: grid.cellH,
          });
        }
      }

      done++;
      onProgress?.((done / totalCells) * 100);

      // Yield every row to keep UI responsive
      if (col === grid.cols - 1) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  return detected.sort((a, b) => b.divineValue - a.divineValue);
}

// For quad tabs — scan the full image area, look for any item match anywhere
export async function detectItemsFullScan(
  imageData: ImageData,
  templates: MatchEntry[],
  divinePrice: number,
  onProgress?: (pct: number) => void
): Promise<DetectedItem[]> {
  const detected: DetectedItem[] = [];
  const MIN_SCORE = 0.25;

  // Use a sliding window at the expected icon size
  const iconSize = TEMPLATE_SIZE;
  const step = Math.floor(iconSize / 2);

  const totalTemplates = templates.length;
  let done = 0;

  for (const tpl of templates) {
    const match = templateMatch(imageData, tpl.tplData, step, step);

    if (match.score < MIN_SCORE) {
      const existing = detected.find((d) => d.name === tpl.name);
      if (!existing) {
        detected.push({
          id: tpl.name,
          name: tpl.name,
          quantity: 1,
          chaosValue: tpl.chaosValue,
          divineValue: tpl.divineValue > 0 ? tpl.divineValue : tpl.chaosValue / divinePrice,
          icon: tpl.icon,
          confidence: 1 - match.score,
          x: match.x,
          y: match.y,
          width: iconSize,
          height: iconSize,
        });
      }
    }

    done++;
    onProgress?.((done / totalTemplates) * 100);

    if (done % 10 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  return detected
    .sort((a, b) => b.divineValue - a.divineValue)
    .slice(0, 50); // Cap at 50 for perf
}

// Entry-point: choose strategy based on tab type
export async function processScreenshot(
  file: File,
  tabType: TabType,
  priceMap: PriceMap,
  divinePrice: number,
  onProgress?: (stage: string, pct: number) => void,
  suppliedGrid?: GridConfig | null
): Promise<DetectedItem[]> {
  // Load screenshot into ImageData
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Build template cache
  onProgress?.('Loading price icons…', 0);
  const templates = await buildTemplateCache(priceMap, (pct) => {
    onProgress?.('Loading price icons…', pct);
  });

  if (templates.length === 0) {
    return [];
  }

  onProgress?.('Analysing screenshot…', 0);

  const isStructured = tabType === 'currency' || tabType === 'essence' || tabType === 'omen'
    || tabType === 'rune' || tabType === 'fragment';

  if (isStructured) {
    // Use OCR-derived grid if available, otherwise fall back to proportional estimate
    const grid = suppliedGrid ?? autoDetectGrid(imageData);
    if (grid) {
      return detectItemsInGrid(imageData, templates, grid, divinePrice, (pct) => {
        onProgress?.('Analysing screenshot…', pct);
      });
    }
  }

  // Fallback: full scan (for quad/other/unknown)
  return detectItemsFullScan(imageData, templates, divinePrice, (pct) => {
    onProgress?.('Scanning for items…', pct);
  });
}
