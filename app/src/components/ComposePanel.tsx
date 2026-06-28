"use client";
import { useState } from "react";
import type { Item } from "@/lib/types";
import { getPhotoBlob } from "@/lib/store";
import { blobToDataUrl } from "@/lib/image";
import { dateGarment, priceItem, writeListing } from "@/lib/api";
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

  async function doDate() {
    await run("date", async () => {
      const tagPhotos = item.photos.filter((p) => p.hiRes || p.role === "brand_tag" || p.role === "care_tag");
      const source = tagPhotos.length ? tagPhotos : item.photos.slice(0, 3);
      const urls: string[] = [];
      for (const p of source) {
        const blob = await getPhotoBlob(p.blobKey);
        if (blob) urls.push(await blobToDataUrl(blob));
      }
      const dating = await dateGarment(urls);
      onChange({ ...item, dating, decadeConfirmed: item.decadeConfirmed || dating.decade });
    });
  }

  async function doPrice() {
    await run("price", async () => {
      const price = await priceItem(itemFacts(item), item.comps ?? "");
      onChange({ ...item, price, finalPrice: item.finalPrice ?? price.suggested ?? undefined });
    });
  }

  async function doWrite() {
    await run("write", async () => {
      const listing = await writeListing(itemFacts(item));
      onChange({ ...item, listing, status: item.status === "captured" ? "drafted" : item.status });
    });
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
          {err.includes("ANTHROPIC_API_KEY") && " — add it to app/.env.local and restart."}
        </div>
      )}

      {/* Dating */}
      <Section title="1 · Date & authenticate">
        <button onClick={doDate} disabled={busy === "date"} className={btn}>
          {busy === "date" ? "Reading tags…" : "Date from photos"}
        </button>
        {item.dating && (
          <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
            <p>
              <b>{item.dating.decade}</b>{" "}
              <span className="rounded bg-neutral-200 px-1 text-xs">{item.dating.confidence} confidence</span>
            </p>
            {item.dating.cues.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-neutral-600">
                {item.dating.cues.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
            <label className="mt-2 block text-xs font-medium text-neutral-500">Confirmed era (override if needed)</label>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
              value={item.decadeConfirmed ?? ""}
              onChange={(e) => onChange({ ...item, decadeConfirmed: e.target.value })}
            />
          </div>
        )}
      </Section>

      {/* Pricing */}
      <Section title="2 · Price from sold comps">
        <a href={soldCompsUrl(item)} target="_blank" rel="noreferrer" className={btnGhost}>
          Open eBay sold comps ↗
        </a>
        <textarea
          className="mt-2 h-28 w-full rounded-lg border border-neutral-300 p-2 text-sm"
          placeholder="Paste the sold results here…"
          value={item.comps ?? ""}
          onChange={(e) => onChange({ ...item, comps: e.target.value })}
        />
        <button onClick={doPrice} disabled={busy === "price"} className={`mt-2 ${btn}`}>
          {busy === "price" ? "Pricing…" : "Suggest price"}
        </button>
        {item.price && (
          <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
            <p>
              Suggested <b>{item.price.suggested != null ? `$${item.price.suggested}` : "—"}</b>
              {item.price.low != null && item.price.high != null && (
                <span className="text-neutral-500"> (${item.price.low}–${item.price.high})</span>
              )}
            </p>
            <p className="mt-1 text-xs text-neutral-600">{item.price.reasoning}</p>
            <label className="mt-2 block text-xs font-medium text-neutral-500">Final price</label>
            <input
              type="number"
              className="mt-1 w-32 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
              value={item.finalPrice ?? ""}
              onChange={(e) => onChange({ ...item, finalPrice: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
        )}
      </Section>

      {/* Writing */}
      <Section title="3 · Generate listing">
        <button onClick={doWrite} disabled={busy === "write"} className={btn}>
          {busy === "write" ? "Writing…" : "Write title + specifics + description"}
        </button>
        {item.listing && (
          <div className="mt-3 space-y-3">
            <Copyable label={`Title (${item.listing.title.length} chars)`} text={item.listing.title} />
            <Copyable
              label="Item specifics"
              text={Object.entries(item.listing.itemSpecifics).map(([k, v]) => `${k}: ${v}`).join("\n")}
            />
            <Copyable
              label="Description"
              text={`${item.listing.description}\n\n${measurementBlock(item)}`}
              big
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
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Copyable({ label, text, big }: { label: string; text: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="rounded-lg border border-neutral-200">
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-1.5">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        <button onClick={copy} className="text-xs font-medium text-blue-600">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={`whitespace-pre-wrap px-3 py-2 text-sm ${big ? "" : ""}`}>{text}</pre>
    </div>
  );
}

const btn = "rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
const btnGhost = "inline-block rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium";
