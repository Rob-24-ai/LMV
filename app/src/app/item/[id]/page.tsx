"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getItem, saveItem, deleteItem } from "@/lib/store";
import { STATUS_LABELS, STATUS_ORDER, type Item, type ItemStatus } from "@/lib/types";
import { PhotoChecklist } from "@/components/PhotoChecklist";
import { DetailsForm, MeasurementsForm, ConditionForm } from "@/components/CaptureForms";
import { MeasurementDiagram } from "@/components/MeasurementDiagram";
import { ComposePanel } from "@/components/ComposePanel";

type Tab = "capture" | "compose";

export default function ItemPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("capture");

  useEffect(() => {
    getItem(id).then((i) => setItem(i ?? null));
  }, [id]);

  const update = useCallback((next: Item) => {
    setItem(next);
    saveItem(next);
  }, []);

  if (item === undefined) return <p className="p-6 text-sm text-ink-soft">Loading…</p>;
  if (item === null)
    return (
      <div className="p-6">
        <p className="text-sm text-ink-soft">Item not found.</p>
        <Link href="/" className="text-sm font-semibold text-pumpkin">← Back</Link>
      </div>
    );

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          style={{ fontFamily: "var(--font-fun), system-ui, sans-serif" }}
          className="text-2xl text-pumpkin transition-transform hover:-translate-x-0.5"
        >
          ← Pipeline
        </Link>
        <StatusPicker item={item} onChange={update} />
      </div>

      <input
        value={item.name}
        onChange={(e) => update({ ...item, name: e.target.value })}
        className="mb-1 w-full bg-transparent text-2xl font-bold outline-none placeholder:text-ink-soft"
      />
      <div className="groovy-rule mb-5 mt-1" />

      {/* Mobile tabs */}
      <div className="mb-4 flex gap-2 lg:hidden">
        {(["capture", "compose"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-bold uppercase tracking-wide capitalize transition-colors ${
              tab === t ? "bg-pumpkin text-paper" : "border-2 border-ink/25 text-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className={tab === "capture" ? "" : "hidden lg:block"}>
          <Capture item={item} onChange={update} />
        </div>
        <div className={tab === "compose" ? "" : "hidden lg:block"}>
          <ComposePanel item={item} onChange={update} />
        </div>
      </div>

      <div className="mt-10 border-t-2 border-ink/10 pt-4">
        <button
          onClick={async () => {
            if (confirm("Delete this item and its photos?")) {
              await deleteItem(item);
              window.location.href = "/";
            }
          }}
          className="text-xs font-semibold text-brick"
        >
          Delete item
        </button>
      </div>
    </main>
  );
}

function Capture({ item, onChange }: { item: Item; onChange: (n: Item) => void }) {
  return (
    <div className="space-y-8">
      <Block title="Details">
        <DetailsForm item={item} onChange={onChange} />
      </Block>
      <Block title="Photos">
        <PhotoChecklist item={item} onChange={onChange} />
      </Block>
      <Block title="Measurements">
        <MeasurementDiagram garmentType={item.garmentType} />
        <MeasurementsForm item={item} onChange={onChange} />
      </Block>
      <Block title="Condition & flaws">
        <ConditionForm item={item} onChange={onChange} />
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 inline-block rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusPicker({ item, onChange }: { item: Item; onChange: (n: Item) => void }) {
  return (
    <select
      value={item.status}
      onChange={(e) => onChange({ ...item, status: e.target.value as ItemStatus })}
      className="rounded-full border-2 border-ink/25 bg-paper px-3 py-1.5 text-sm font-semibold outline-none focus:border-pumpkin"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
