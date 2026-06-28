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
  styleKeywords: string[];
  measurements: Measurements;
  conditionGrade?: ConditionGrade;
  flaws: Flaw[];
  photos: PhotoMeta[];

  // Compose (filled by the AI + operator)
  dating?: DatingResult;
  decadeConfirmed?: string;
  comps?: string; // pasted sold-comps text (transient-ish, kept for audit)
  price?: PriceResult;
  finalPrice?: number;
  listing?: GeneratedListing;
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
