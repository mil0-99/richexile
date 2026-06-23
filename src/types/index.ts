export type TabType =
  | 'currency'
  | 'essence'
  | 'omen'
  | 'rune'
  | 'quad'
  | 'unique'
  | 'gem'
  | 'fragment'
  | 'other';

export interface League {
  id: string;
  realm: string;
  season?: string;
}


export interface PriceMap {
  [name: string]: {
    chaosValue: number;
    divineValue: number;
    icon: string;
  };
}

export interface DetectedItem {
  id: string;
  name: string;
  quantity: number;
  chaosValue: number;
  divineValue: number;
  icon: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export type ProcessingState =
  | 'idle'
  | 'fetching-prices'
  | 'processing-image'
  | 'done'
  | 'error';

export interface ProcessingProgress {
  stage: string;
  percent: number;
}

export interface StashAnalysis {
  items: DetectedItem[];
  totalChaos: number;
  totalDivines: number;
  tabType: TabType;
  divinePrice: number;
}
