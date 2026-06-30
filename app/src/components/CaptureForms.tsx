"use client";
import { useState } from "react";
import { MEASURE_FIELDS, FLAW_TYPES, CONDITION_GRADES } from "@/lib/config";
import type { Item, Measurements, MeasureRead, Flaw, FlawType, ConditionGrade } from "@/lib/types";
import { readMeasurements, collectPhotos } from "@/lib/api";
import { makeId } from "@/lib/store";

const inputCls =
  "w-full rounded-xl border-2 border-ink/25 bg-paper px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-soft focus:border-pumpkin";

export function DetailsForm({ item, onChange }: { item: Item; onChange: (n: Item) => void }) {
  const set = (patch: Partial<Item>) => onChange({ ...item, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Brand" value={item.brand ?? ""} onChange={(v) => set({ brand: v })} placeholder="or Unbranded" />
      <Field label="Garment type" value={item.garmentType ?? ""} onChange={(v) => set({ garmentType: v })} placeholder="maxi dress" />
      <Field label="Color" value={item.color ?? ""} onChange={(v) => set({ color: v })} />
      <Field label="Material" value={item.material ?? ""} onChange={(v) => set({ material: v })} placeholder="100% cotton" />
      <div className="col-span-2">
        <Label>Style keywords (comma-separated)</Label>
        <input
          className={inputCls}
          value={item.styleKeywords.join(", ")}
          onChange={(e) => set({ styleKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          placeholder="boho, prairie, cottagecore"
        />
      </div>
    </div>
  );
}

export function MeasurementsForm({ item, onChange }: { item: Item; onChange: (n: Item) => void }) {
  const [reading, setReading] = useState(false);
  const [readErr, setReadErr] = useState<string | null>(null);
  const [reads, setReads] = useState<MeasureRead[] | null>(null);

  function set(key: keyof Measurements, raw: string) {
    const v = raw === "" ? undefined : Number(raw);
    onChange({ ...item, measurements: { ...item.measurements, [key]: Number.isNaN(v) ? undefined : v } });
  }

  // Read the tape off the measurement shots and pre-fill EMPTY fields only —
  // never clobber a number you typed. The banner is the confirm step.
  async function readTape() {
    setReading(true);
    setReadErr(null);
    try {
      const photos = await collectPhotos(item, ["scale"]);
      if (photos.length === 0) {
        setReadErr("Add measurement shots in Photos first — lay the tape along each dimension.");
        return;
      }
      const res = await readMeasurements(photos);
      const next = { ...item.measurements };
      for (const r of res.reads) {
        if (r.value != null && next[r.field] == null) next[r.field] = r.value;
      }
      onChange({ ...item, measurements: next });
      setReads(res.reads);
    } catch (e) {
      setReadErr(e instanceof Error ? e.message : "couldn't read the tape");
    } finally {
      setReading(false);
    }
  }

  const labelFor = (k: keyof Measurements) => MEASURE_FIELDS.find((f) => f.key === k)?.label ?? k;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={readTape}
          disabled={reading}
          className="rounded-full bg-pumpkin px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-paper shadow-[2px_2px_0_rgba(59,42,24,0.3)] transition-transform active:translate-y-0.5 disabled:opacity-50"
        >
          {reading ? "Reading the tape…" : "📏 Read tape from photos"}
        </button>
        <span className="text-[11px] text-ink-soft">Pre-fills from your measurement shots — confirm each.</span>
      </div>

      {readErr && (
        <div className="rounded-xl border-2 border-brick/40 bg-brick/10 px-3 py-2 text-xs font-medium text-brick">
          {readErr}
        </div>
      )}

      {reads && (
        <div className="rounded-xl border-2 border-ink/15 bg-cream p-3 text-xs">
          <p className="mb-1 font-semibold text-ink">Read from the tape — verify before listing:</p>
          {reads.length === 0 ? (
            <p className="text-ink-soft">No tape readings found in those shots.</p>
          ) : (
            <ul className="space-y-0.5">
              {reads.map((r, i) => {
                const trusted = r.confidence === "high" && r.value != null;
                return (
                  <li key={i} className={trusted ? "text-ink" : "text-brick"}>
                    <b>{labelFor(r.field)}:</b> {r.value != null ? `${r.value} in` : "couldn't read"}
                    {!trusted && <span> — check{r.note ? ` (${r.note})` : ""}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {MEASURE_FIELDS.map((f) => (
          <div key={f.key}>
            <Label>{f.label}{f.doubled ? " (flat)" : ""}</Label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                className={inputCls}
                value={item.measurements[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
              <span className="text-xs text-ink-soft">in</span>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-soft">{f.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConditionForm({ item, onChange }: { item: Item; onChange: (n: Item) => void }) {
  function toggleGrade(grade: ConditionGrade) {
    onChange({ ...item, conditionGrade: grade });
  }
  function addFlaw(type: FlawType) {
    const flaw: Flaw = { id: makeId("flaw"), type };
    onChange({ ...item, flaws: [...item.flaws, flaw] });
  }
  function updateFlaw(id: string, note: string) {
    onChange({ ...item, flaws: item.flaws.map((f) => (f.id === id ? { ...f, note } : f)) });
  }
  function removeFlaw(id: string) {
    onChange({ ...item, flaws: item.flaws.filter((f) => f.id !== id) });
  }
  return (
    <div className="space-y-4">
      <div>
        <Label>Overall grade</Label>
        <div className="flex flex-wrap gap-2">
          {CONDITION_GRADES.map((g) => (
            <button
              key={g.grade}
              onClick={() => toggleGrade(g.grade)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                item.conditionGrade === g.grade
                  ? "bg-pumpkin text-paper"
                  : "border-2 border-ink/25 text-ink hover:border-pumpkin"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Flaws (add chips, note each)</Label>
        <div className="mb-2 flex flex-wrap gap-2">
          {FLAW_TYPES.map((f) => (
            <button
              key={f.type}
              onClick={() => addFlaw(f.type)}
              className="rounded-full border-2 border-ink/25 px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-pumpkin hover:text-pumpkin"
            >
              + {f.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {item.flaws.map((fl) => (
            <div key={fl.id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium capitalize">{fl.type}</span>
              <input
                className={inputCls}
                value={fl.note ?? ""}
                onChange={(e) => updateFlaw(fl.id, e.target.value)}
                placeholder="e.g. pea-sized mark, left cuff"
              />
              <button onClick={() => removeFlaw(fl.id)} className="text-brick">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-ink-soft">{children}</label>;
}
