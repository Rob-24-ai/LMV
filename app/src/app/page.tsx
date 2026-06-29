"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listItems, saveItem, makeId } from "@/lib/store";
import { newItem, STATUS_LABELS, STATUS_ORDER, type Item, type ItemStatus } from "@/lib/types";
import { Thumb } from "@/components/Thumb";

// Each pipeline stage gets a color from the era's palette.
const STATUS_COLOR: Record<ItemStatus, string> = {
  to_shoot: "bg-teal text-paper",
  captured: "bg-mustard text-ink",
  drafted: "bg-pumpkin text-paper",
  listed: "bg-avocado text-paper",
  sold: "bg-brick text-paper",
};

export default function Dashboard() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [name, setName] = useState("");

  async function refresh() {
    setItems(await listItems());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    const label = name.trim();
    if (!label) return;
    const item = newItem(makeId("itm"), label, Date.now());
    await saveItem(item);
    setName("");
    await refresh();
  }

  const byStatus = (s: ItemStatus) => (items ?? []).filter((i) => i.status === s);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <header className="mb-6 text-center sm:text-left">
        <h1
          style={{ fontFamily: "var(--font-fun), system-ui, sans-serif" }}
          className="text-5xl leading-none text-pumpkin drop-shadow-[2px_2px_0_rgba(59,42,24,0.18)] sm:text-6xl"
        >
          Lick My Vintage
        </h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-ink-soft">
          Far-out little listing machine
        </p>
        <div className="groovy-rule mt-4" />
      </header>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="New item, e.g. floral prairie dress"
          className="flex-1 rounded-full border-2 border-ink/25 bg-paper px-5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-soft focus:border-pumpkin"
        />
        <button
          onClick={create}
          className="rounded-full bg-pumpkin px-7 py-2.5 text-sm font-bold uppercase tracking-wide text-paper shadow-[2px_2px_0_rgba(59,42,24,0.35)] transition-transform active:translate-y-0.5"
        >
          Add it
        </button>
      </div>

      {items === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-ink/20 bg-paper/60 p-8 text-center text-sm text-ink-soft">
          Nothing on the rack yet. Add your first piece above. ✿
        </p>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const group = byStatus(status);
            if (group.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="mb-3 flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${STATUS_COLOR[status]}`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs font-semibold text-ink-soft">{group.length}</span>
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {group.map((item) => (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className="group overflow-hidden rounded-2xl border-2 border-ink/80 bg-paper shadow-[3px_3px_0_rgba(59,42,24,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_5px_0_rgba(219,93,28,0.4)]"
                    >
                      <div className="aspect-square w-full bg-cream">
                        {item.photos[0] ? (
                          <Thumb blobKey={item.photos[0].blobKey} className="h-full w-full" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl text-ink/20">
                            ✿
                          </div>
                        )}
                      </div>
                      <div className="border-t-2 border-ink/80 p-2.5">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-ink-soft">
                          {item.photos.length} photo{item.photos.length === 1 ? "" : "s"}
                          {item.finalPrice ? ` · $${item.finalPrice}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
