// eBay sold/completed-listings search URL. This is a known-fragile seam (eBay
// churns these params); keep it in ONE place so a break is a one-line fix.
import type { Item } from "./types";

export function soldCompsUrl(item: Item): string {
  const terms = [
    item.brand,
    item.decadeConfirmed || item.dating?.decade,
    item.garmentType,
    item.color,
    ...item.styleKeywords,
  ]
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams({
    _nkw: terms || item.name,
    LH_Sold: "1",
    LH_Complete: "1",
    _sop: "13", // sort: end date, recent first
  });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}
