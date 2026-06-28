"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listItems, saveItem, makeId } from "@/lib/store";
import { newItem, STATUS_LABELS, STATUS_ORDER, type Item, type ItemStatus } from "@/lib/types";
import { Thumb } from "@/components/Thumb";

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
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Lick My Vintage</h1>
        <p className="text-sm text-neutral-500">Listing pipeline</p>
      </header>

      <div className="mb-8 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="New item label, e.g. floral prairie dress"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          onClick={create}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      {items === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-400">No items yet. Add one above to start.</p>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const group = byStatus(status);
            if (group.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {STATUS_LABELS[status]} · {group.length}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {group.map((item) => (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className="group overflow-hidden rounded-xl border border-neutral-200 bg-white"
                    >
                      <div className="aspect-square w-full bg-neutral-100">
                        {item.photos[0] ? (
                          <Thumb blobKey={item.photos[0].blobKey} className="h-full w-full" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl text-neutral-300">
                            +
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-neutral-400">
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
