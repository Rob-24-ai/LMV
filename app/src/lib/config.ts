// UI configuration: the capture checklist, measurement fields, flaw chips.
import type { PhotoRole, FlawType, ConditionGrade } from "./types";

export interface PhotoSlot {
  role: PhotoRole;
  label: string;
  hint: string;
  multi?: boolean;
  required?: boolean;
}

// The guided photo checklist. Order = shoot sequence.
export const PHOTO_SLOTS: PhotoSlot[] = [
  { role: "front", label: "Front", hint: "Whole garment, flat or on form", required: true },
  { role: "back", label: "Back", hint: "Whole garment from behind", required: true },
  { role: "side", label: "Side", hint: "Drape and silhouette" },
  { role: "brand_tag", label: "Brand tag", hint: "Fill the frame — read the label", required: true },
  { role: "care_tag", label: "Care / union tag", hint: "RN number, care symbols, union label" },
  { role: "fabric", label: "Fabric close-up", hint: "Weave and texture" },
  { role: "flaw", label: "Flaws", hint: "One shot per flaw, close", multi: true },
  {
    role: "scale",
    label: "Measurement shots",
    hint: "Lay a tape flat along each dimension — pit-to-pit, waist, length, sleeve. One shot per dimension, fill the frame so the numbers read. Claude can read these into the measurements.",
    multi: true,
  },
  { role: "extra", label: "Extra", hint: "Anything else worth showing", multi: true },
];

export interface MeasureField {
  key: keyof import("./types").Measurements;
  label: string;
  hint: string;
  doubled?: boolean; // shown as flat + total
}

export const MEASURE_FIELDS: MeasureField[] = [
  { key: "bust", label: "Bust (pit-to-pit)", hint: "Flat, armpit to armpit", doubled: true },
  { key: "waist", label: "Waist", hint: "Flat at narrowest", doubled: true },
  { key: "hips", label: "Hips", hint: "Flat at fullest", doubled: true },
  { key: "length", label: "Length", hint: "Shoulder seam to hem" },
  { key: "shoulder", label: "Shoulder width", hint: "Seam to seam" },
  { key: "sleeve", label: "Sleeve", hint: "Shoulder seam to cuff" },
  { key: "rise", label: "Rise", hint: "Bottoms only" },
  { key: "inseam", label: "Inseam", hint: "Bottoms only" },
  { key: "hemOpening", label: "Hem opening", hint: "Flat across the bottom — skirts & dresses" },
  { key: "legOpening", label: "Leg opening", hint: "One cuff, flat — pants & shorts" },
];

export const FLAW_TYPES: { type: FlawType; label: string }[] = [
  { type: "stain", label: "Stain" },
  { type: "hole", label: "Hole / moth nibble" },
  { type: "fade", label: "Fading" },
  { type: "pilling", label: "Pilling" },
  { type: "repair", label: "Repair" },
  { type: "odor", label: "Odor" },
  { type: "wear", label: "General wear" },
  { type: "other", label: "Other" },
];

export const CONDITION_GRADES: { grade: ConditionGrade; label: string }[] = [
  { grade: "excellent", label: "Excellent" },
  { grade: "very_good", label: "Very Good" },
  { grade: "good", label: "Good" },
  { grade: "fair", label: "Fair" },
];
