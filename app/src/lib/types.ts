// Core domain types for Lick My Vintage listing assistant.

export type ItemStatus = "to_shoot" | "captured" | "drafted" | "listed" | "sold";

export const STATUS_LABELS: Record<ItemStatus, string> = {
  to_shoot: "To shoot",
  captured: "Captured",
  drafted: "Drafted",
  listed: "Listed",
  sold: "Sold",
};

export const STATUS_ORDER: ItemStatus[] = [
  "to_shoot",
  "captured",
  "drafted",
  "listed",
  "sold",
];

// Photo roles the capture checklist walks through. `multi` roles (flaw, extra)
// can have many photos; the rest are single-shot.
export type PhotoRole =
  | "front"
  | "back"
  | "side"
  | "brand_tag"
  | "care_tag"
  | "fabric"
  | "flaw"
  | "scale"
  | "extra";

export interface PhotoMeta {
  id: string;
  role: PhotoRole;
  createdAt: number;
  // Bytes live in IndexedDB under this key; UI resolves to an object URL.
  blobKey: string;
  // True for tag shots we send at high-res to the dating call.
  hiRes?: boolean;
}

export interface Measurements {
  bust?: number; // pit-to-pit, flat inches
  waist?: number;
  hips?: number;
  length?: number; // shoulder to hem
  shoulder?: number;
  sleeve?: number;
  rise?: number;
  inseam?: number;
}

export type FlawType =
  | "stain"
  | "hole"
  | "fade"
  | "pilling"
  | "repair"
  | "odor"
  | "wear"
  | "other";

export interface Flaw {
  id: string;
  type: FlawType;
  note?: string;
  photoId?: string;
}

export type ConditionGrade = "excellent" | "very_good" | "good" | "fair";

export interface GeneratedListing {
  title: string;
  itemSpecifics: Record<string, string>;
  description: string;
}

export interface DatingResult {
  decade: string;
  confidence: "low" | "medium" | "high";
  cues: string[];
  notableLabels: string[];
}

export interface PriceResult {
  suggested: number | null;
  low: number | null;
  high: number | null;
  reasoning: string;
}

// One dimension read off a tape measure in a photo. value is null when a tape is
// present but the number/endpoint isn't legible — never a guess. The operator
// confirms every value before it's used.
export interface MeasureRead {
  field: keyof Measurements;
  value: number | null;
  confidence: "low" | "medium" | "high";
  note?: string;
}

export interface MeasureResult {
  reads: MeasureRead[];
}

export interface Item {
  id: string;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;

  // Capture
  name: string; // operator's working label, e.g. "floral prairie dress"
  garmentType?: string;
  brand?: string;
  color?: string;
  material?: string;
  pattern?: string;
  neckline?: string;
  sleeveType?: string;
  closure?: string;
  styleKeywords: string[];
  measurements: Measurements;
  conditionGrade?: ConditionGrade;
  flaws: Flaw[];
  photos: PhotoMeta[];

  // Compose (filled by the AI + operator)
  dating?: DatingResult;
  decadeConfirmed?: string;
  estimatedValueLow?: number | null;
  estimatedValueHigh?: number | null;
  valueNote?: string;
  comps?: string; // pasted sold-comps text (transient-ish, kept for audit)
  price?: PriceResult;
  finalPrice?: number;
  listing?: GeneratedListing;
}

// Shape returned by the vision "analyze" call.
export interface AnalyzeResult {
  brand?: string;
  garmentType: string;
  color: string;
  material?: string;
  pattern?: string;
  neckline?: string;
  sleeveType?: string;
  closure?: string;
  styleKeywords: string[];
  decade: string;
  decadeConfidence: "low" | "medium" | "high";
  cues: string[];
  notableLabels?: string[];
  estimatedValueLow?: number | null;
  estimatedValueHigh?: number | null;
  valueNote?: string;
}

// Merge a vision analysis into an item without clobbering anything the operator
// already typed.
export function applyAnalysis(item: Item, a: AnalyzeResult): Item {
  const keep = <T>(existing: T | undefined, found: T | undefined) =>
    existing != null && existing !== "" ? existing : found;
  return {
    ...item,
    brand: keep(item.brand, a.brand),
    garmentType: keep(item.garmentType, a.garmentType),
    color: keep(item.color, a.color),
    material: keep(item.material, a.material),
    pattern: keep(item.pattern, a.pattern),
    neckline: keep(item.neckline, a.neckline),
    sleeveType: keep(item.sleeveType, a.sleeveType),
    closure: keep(item.closure, a.closure),
    styleKeywords: item.styleKeywords.length ? item.styleKeywords : a.styleKeywords,
    decadeConfirmed: item.decadeConfirmed || a.decade,
    dating: {
      decade: a.decade,
      confidence: a.decadeConfidence,
      cues: a.cues,
      notableLabels: a.notableLabels ?? [],
    },
    estimatedValueLow: a.estimatedValueLow ?? null,
    estimatedValueHigh: a.estimatedValueHigh ?? null,
    valueNote: a.valueNote,
  };
}

export function newItem(id: string, name: string, now: number): Item {
  return {
    id,
    status: "to_shoot",
    createdAt: now,
    updatedAt: now,
    name,
    styleKeywords: [],
    measurements: {},
    flaws: [],
    photos: [],
  };
}
