"use client";
import { useState } from "react";
import type { Item } from "@/lib/types";
import { applyAnalysis } from "@/lib/types";
import { analyzeGarment, priceItem, writeListing, collectPhotos } from "@/lib/api";
import { itemFacts, measurementBlock } from "@/lib/facts";
import { soldCompsUrl } from "@/lib/ebay";

export function ComposePanel({ item, onChange }: { item: Item; onChange: (n: Item) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(null);
    }
  }

  // The headline action: look at the photos, identify + date + value the piece,
  // then write the full listing. Minimal typing required.
  async function generate() {
    await run("generate", async () => {
      const photos = await collectPhotos(item);
      if (photos.length === 0) throw new Error("Add at least one photo first.");
      const analysis = await analyzeGarment(photos);
      const analyzed = applyAnalysis(item, analysis);
      const listing = await writeListing(itemFacts(analyzed), photos);
      onChange({
        ...analyzed,
        listing,
        status: analyzed.status === "to_shoot" || analyzed.status === "captured" ? "drafted" : analyzed.status,
      });
    });
  }

  async function rewrite() {
    await run("write", async () => {
      const photos = await collectPhotos(item);
      const listing = await writeListing(itemFacts(item), photos);
      onChange({ ...item, listing });
    });
  }

  async function doPrice() {
    await run("price", async () => {
      const price = await priceItem(itemFacts(item), item.comps ?? "");
      onChange({ ...item, price, finalPrice: item.finalPrice ?? price.suggested ?? undefined });
    });
  }

  const v = item;

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-xl border-2 border-brick/40 bg-brick/10 px-3 py-2 text-sm font-medium text-brick">
          {err}
          {err.includes("ANTHROPIC_API_KEY") && " — add it to .env.local and restart."}
        </div>
      )}

      <button
        onClick={generate}
        disabled={busy !== null}
        className="w-full rounded-full bg-gradient-to-r from-pumpkin to-mustard px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-paper shadow-[3px_3px_0_rgba(59,42,24,0.3)] transition-transform active:translate-y-0.5 disabled:opacity-50"
      >
        {busy === "generate" ? "Looking at the photos, writing…" : "✨ Generate listing from photos"}
      </button>
      <p className="-mt-3 text-xs text-ink-soft">
        Reads the garment and tags, dates it, estimates value, and writes the full listing. Add
        measurements in the Capture tab — type them, or shoot the tape and tap “Read tape”.
      </p>

      {/* What it found */}
      {(v.dating || v.brand || v.estimatedValueLow != null) && (
        <Section title="What it found">
          <div className="rounded-xl border-2 border-ink/15 bg-cream p-3 text-sm">
            {v.brand && <Line k="Brand" val={v.brand} />}
            {v.garmentType && <Line k="Type" val={v.garmentType} />}
            {v.color && <Line k="Color" val={v.color} />}
            {v.material && <Line k="Material" val={v.material} />}
            {v.pattern && <Line k="Pattern" val={v.pattern} />}
            {v.neckline && <Line k="Neckline" val={v.neckline} />}
            {v.sleeveType && <Line k="Sleeve" val={v.sleeveType} />}
            {v.closure && <Line k="Closure" val={v.closure} />}
            {v.dating && (
              <div className="mt-2">
                <Line
                  k="Era"
                  val={`${v.dating.decade} (${v.dating.confidence} confidence)`}
                />
                {v.dating.cues.length > 0 && (
                  <ul className="ml-1 mt-1 list-inside list-disc text-xs text-ink-soft">
                    {v.dating.cues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
                <label className="mt-2 block text-xs font-semibold text-ink-soft">
                  Confirm / override era
                </label>
                <input
                  className="mt-1 w-full rounded-xl border-2 border-ink/25 bg-paper px-3 py-1.5 text-sm outline-none focus:border-pumpkin"
                  value={v.decadeConfirmed ?? ""}
                  onChange={(e) => onChange({ ...item, decadeConfirmed: e.target.value })}
                />
              </div>
            )}
            {(v.estimatedValueLow != null || v.estimatedValueHigh != null) && (
              <div className="mt-2">
                <Line
                  k="Est. value"
                  val={`$${v.estimatedValueLow ?? "?"}–$${v.estimatedValueHigh ?? "?"}`}
                />
                {v.valueNote && <p className="text-xs text-ink-soft">{v.valueNote}</p>}
                <p className="mt-1 text-xs font-medium text-pumpkin">
                  Estimate only — confirm with sold comps below before pricing.
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Listing output */}
      {v.listing && (
        <Section title="Listing">
          <div className="space-y-3">
            <Copyable label={`Title (${v.listing.title.length} chars)`} text={v.listing.title} />
            <Copyable
              label="Item specifics"
              text={Object.entries(v.listing.itemSpecifics)
                .map(([k, val]) => `${k}: ${val}`)
                .join("\n")}
            />
            <Copyable
              label="Description"
              text={
                measurementBlock(item)
                  ? `${v.listing.description}\n\nMeasurements (flat):\n${measurementBlock(item)}`
                  : v.listing.description
              }
            />
            <button onClick={rewrite} disabled={busy !== null} className={btnGhost}>
              {busy === "write" ? "Rewriting…" : "Rewrite"}
            </button>
          </div>
        </Section>
      )}

      {/* Pricing refine */}
      <Section title="Price from sold comps (optional refine)">
        <a href={soldCompsUrl(item)} target="_blank" rel="noreferrer" className={btnGhost}>
          Open eBay sold comps ↗
        </a>
        <textarea
          className="mt-2 h-24 w-full rounded-xl border-2 border-ink/25 bg-paper p-2 text-sm outline-none transition-colors placeholder:text-ink-soft focus:border-pumpkin"
          placeholder="Paste the sold results here to ground the price…"
          value={item.comps ?? ""}
          onChange={(e) => onChange({ ...item, comps: e.target.value })}
        />
        <button onClick={doPrice} disabled={busy !== null} className={`mt-2 ${btn}`}>
          {busy === "price" ? "Pricing…" : "Suggest price from comps"}
        </button>
        {item.price && (
          <div className="mt-3 rounded-xl border-2 border-ink/15 bg-cream p-3 text-sm">
            <p>
              Suggested <b>{item.price.suggested != null ? `$${item.price.suggested}` : "—"}</b>
              {item.price.low != null && item.price.high != null && (
                <span className="text-ink-soft"> (${item.price.low}–${item.price.high})</span>
              )}
            </p>
            <p className="mt-1 text-xs text-ink-soft">{item.price.reasoning}</p>
            <label className="mt-2 block text-xs font-semibold text-ink-soft">Final price</label>
            <input
              type="number"
              className="mt-1 w-32 rounded-xl border-2 border-ink/25 bg-paper px-3 py-1.5 text-sm outline-none focus:border-pumpkin"
              value={item.finalPrice ?? ""}
              onChange={(e) =>
                onChange({ ...item, finalPrice: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 inline-block rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Line({ k, val }: { k: string; val: string }) {
  return (
    <p className="text-sm">
      <span className="text-ink-soft">{k}: </span>
      {val}
    </p>
  );
}

function Copyable({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="overflow-hidden rounded-xl border-2 border-ink/80 bg-paper">
      <div className="flex items-center justify-between border-b-2 border-ink/80 bg-cream px-3 py-1.5">
        <span className="text-xs font-semibold text-ink-soft">{label}</span>
        <button onClick={copy} className="text-xs font-bold uppercase tracking-wide text-teal">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap px-3 py-2 text-sm">{text}</pre>
    </div>
  );
}

const btn =
  "rounded-full bg-pumpkin px-5 py-2 text-sm font-bold uppercase tracking-wide text-paper shadow-[2px_2px_0_rgba(59,42,24,0.3)] transition-transform active:translate-y-0.5 disabled:opacity-50";
const btnGhost =
  "inline-block rounded-full border-2 border-ink/25 px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors hover:border-pumpkin hover:text-pumpkin disabled:opacity-50";
