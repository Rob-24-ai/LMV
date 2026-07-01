"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GUIDES } from "@/lib/guides";

// A persistent menu so nothing is walled behind the listing flow — jump
// straight to the pipeline or any reference guide from anywhere.
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close on route change, Escape, or click outside.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink/10 bg-cream/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="text-xl leading-none text-pumpkin transition-transform hover:-translate-y-0.5"
          style={{ fontFamily: "var(--font-fun), system-ui, sans-serif" }}
          aria-label="Lick My Vintage — pipeline"
        >
          ✿ LMV
        </Link>

        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-full border-2 border-ink/25 bg-paper px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-ink shadow-[2px_2px_0_rgba(59,42,24,0.2)] transition-colors hover:border-pumpkin"
          >
            <span aria-hidden>☰</span> Menu
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border-2 border-ink/80 bg-paper shadow-[4px_5px_0_rgba(59,42,24,0.3)]"
            >
              <MenuLink href="/" label="Pipeline" hint="Your rack of items" active={pathname === "/"} />
              <div className="border-t-2 border-ink/10 px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Guides
              </div>
              {GUIDES.map((g) => (
                <MenuLink
                  key={g.slug}
                  href={`/guide/${g.slug}`}
                  label={g.title}
                  active={pathname === `/guide/${g.slug}`}
                />
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuLink({
  href,
  label,
  hint,
  active,
}: {
  href: string;
  label: string;
  hint?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={`block px-4 py-2 text-sm transition-colors hover:bg-cream ${
        active ? "font-bold text-pumpkin" : "font-medium text-ink"
      }`}
    >
      {label}
      {hint && <span className="block text-[11px] font-normal text-ink-soft">{hint}</span>}
    </Link>
  );
}
