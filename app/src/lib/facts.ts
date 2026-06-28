// Builds the plain-text "item facts" block we feed the price/write calls, and
// the description-ready measurement block.
import type { Item } from "./types";
import { MEASURE_FIELDS } from "./config";

export function measurementBlock(item: Item): string {
  const lines: string[] = [];
  for (const f of MEASURE_FIELDS) {
    const v = item.measurements[f.key];
    if (v == null) continue;
    lines.push(
      f.doubled
        ? `- ${f.label}: ${v}" flat (${v * 2}" total)`
        : `- ${f.label}: ${v}"`,
    );
  }
  return lines.join("\n");
}

export function itemFacts(item: Item): string {
  const flaws = item.flaws
    .map((fl) => `${fl.type}${fl.note ? `: ${fl.note}` : ""}`)
    .join("; ");

  return [
    `Name: ${item.name}`,
    item.brand && `Brand: ${item.brand}`,
    item.garmentType && `Type: ${item.garmentType}`,
    (item.decadeConfirmed || item.dating?.decade) &&
      `Era: ${item.decadeConfirmed || item.dating?.decade}`,
    item.color && `Color: ${item.color}`,
    item.material && `Material: ${item.material}`,
    item.pattern && `Pattern: ${item.pattern}`,
    item.neckline && `Neckline: ${item.neckline}`,
    item.sleeveType && `Sleeve: ${item.sleeveType}`,
    item.closure && `Closure: ${item.closure}`,
    item.styleKeywords.length && `Style keywords: ${item.styleKeywords.join(", ")}`,
    item.conditionGrade && `Condition grade: ${item.conditionGrade}`,
    flaws && `Flaws: ${flaws}`,
    "",
    "Measurements:",
    measurementBlock(item) || "(none entered)",
  ]
    .filter(Boolean)
    .join("\n");
}
