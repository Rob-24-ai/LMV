"use client";
import { MEASURE_FIELDS, FLAW_TYPES, CONDITION_GRADES } from "@/lib/config";
import type { Item, Measurements, Flaw, FlawType, ConditionGrade } from "@/lib/types";
import { makeId } from "@/lib/store";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

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
  function set(key: keyof Measurements, raw: string) {
    const v = raw === "" ? undefined : Number(raw);
    onChange({ ...item, measurements: { ...item.measurements, [key]: Number.isNaN(v) ? undefined : v } });
  }
  return (
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
            <span className="text-xs text-neutral-400">in</span>
          </div>
          <p className="mt-0.5 text-[11px] text-neutral-400">{f.hint}</p>
        </div>
      ))}
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
              className={`rounded-full px-3 py-1 text-sm ${
                item.conditionGrade === g.grade
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 text-neutral-700"
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
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-700"
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
              <button onClick={() => removeFlaw(fl.id)} className="text-neutral-400">×</button>
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
  return <label className="mb-1 block text-xs font-medium text-neutral-500">{children}</label>;
}
