import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GUIDES, guideBySlug } from "@/lib/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  return { title: guide ? `${guide.title} — Lick My Vintage` : "Guide — Lick My Vintage" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);

  if (!guide) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6">
        <p className="text-sm text-ink-soft">That guide doesn’t exist.</p>
        <Link href="/guide" className="text-sm font-semibold text-pumpkin">← All guides</Link>
      </main>
    );
  }

  const md = await readFile(join(process.cwd(), "src", "reference", guide.file), "utf8");

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Link
        href="/guide"
        className="text-sm font-semibold text-pumpkin transition-transform hover:-translate-x-0.5"
      >
        ← All guides
      </Link>
      <div className="groovy-rule my-4" />
      <article className="guide-prose">
        <Markdown remarkPlugins={[remarkGfm]}>{md}</Markdown>
      </article>
    </main>
  );
}
