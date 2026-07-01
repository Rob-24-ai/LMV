import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata = { title: "Guides — Lick My Vintage" };

// Literal class strings — Tailwind v4 only generates classes it finds verbatim
// in source, so dynamic `bg-${accent}` would silently produce no color.
const ACCENT: Record<string, { bar: string; glow: string }> = {
  pumpkin: { bar: "bg-pumpkin", glow: "hover:shadow-[4px_5px_0_rgba(219,93,28,0.4)]" },
  brick: { bar: "bg-brick", glow: "hover:shadow-[4px_5px_0_rgba(178,58,27,0.4)]" },
  teal: { bar: "bg-teal", glow: "hover:shadow-[4px_5px_0_rgba(29,138,138,0.4)]" },
  avocado: { bar: "bg-avocado", glow: "hover:shadow-[4px_5px_0_rgba(110,138,46,0.4)]" },
  mustard: { bar: "bg-mustard", glow: "hover:shadow-[4px_5px_0_rgba(226,162,31,0.45)]" },
  rose: { bar: "bg-rose", glow: "hover:shadow-[4px_5px_0_rgba(217,131,122,0.5)]" },
};

export default function GuidesIndex() {
  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <header className="mb-6">
        <h1
          style={{ fontFamily: "var(--font-fun), system-ui, sans-serif" }}
          className="text-4xl text-pumpkin drop-shadow-[2px_2px_0_rgba(59,42,24,0.18)]"
        >
          Guides
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          The playbook behind the listings — read any of it without touching an item.
        </p>
        <div className="groovy-rule mt-4" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guide/${g.slug}`}
            className={`group rounded-2xl border-2 border-ink/80 bg-paper p-4 shadow-[3px_3px_0_rgba(59,42,24,0.2)] transition-all hover:-translate-y-0.5 ${ACCENT[g.accent].glow}`}
          >
            <span
              className={`mb-2 inline-block h-2 w-10 rounded-full ${ACCENT[g.accent].bar}`}
              aria-hidden
            />
            <h2 className="text-lg font-bold">{g.title}</h2>
            <p className="mt-0.5 text-sm text-ink-soft">{g.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
