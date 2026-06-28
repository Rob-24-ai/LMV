// Loads the domain knowledge (the lick-my-vintage skill's reference files) so
// the AI calls are grounded, not improvising. Server-only. Cached per process.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = join(process.cwd(), "src", "reference");

const cache = new Map<string, string>();

async function load(name: string): Promise<string> {
  const hit = cache.get(name);
  if (hit) return hit;
  const text = await readFile(join(DIR, name), "utf8");
  cache.set(name, text);
  return text;
}

export async function datingKnowledge(): Promise<string> {
  return load("dating-authentication.md");
}

export async function pricingKnowledge(): Promise<string> {
  return [await load("pricing-fees-sourcing.md"), await load("keywords.md")].join("\n\n");
}

export async function writingKnowledge(): Promise<string> {
  return [
    await load("title-seo.md"),
    await load("keywords.md"),
    await load("condition-grading.md"),
  ].join("\n\n");
}
