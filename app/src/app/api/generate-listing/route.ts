import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, structuredCall } from "@/lib/anthropic.server";
import { datingKnowledge, pricingKnowledge, writingKnowledge } from "@/lib/reference.server";

export const runtime = "nodejs";
export const maxDuration = 60;

// data URL -> Anthropic image block. We pass image BYTES, never a storage URL
// (a private URL would be unfetchable by the model).
function imageBlock(dataUrl: string): Anthropic.Messages.ImageBlockParam | null {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return {
    type: "image",
    source: { type: "base64", media_type: m[1] as "image/jpeg", data: m[2] },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const action = body.action;
  try {
    if (action === "date") return await handleDate(body);
    if (action === "price") return await handlePrice(body);
    if (action === "write") return await handleWrite(body);
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

async function handleDate(body: Record<string, unknown>) {
  const images = Array.isArray(body.images) ? (body.images as string[]) : [];
  const blocks = images.map(imageBlock).filter(Boolean) as Anthropic.Messages.ImageBlockParam[];
  if (blocks.length === 0) {
    return NextResponse.json({ error: "no readable images" }, { status: 400 });
  }

  const result = await structuredCall({
    model: MODELS.dating,
    system:
      "You are an expert vintage womenswear dater. Use the cue guide to pin a decade. " +
      "Use at least 3 independent cues before committing. State the cues. If they don't " +
      "converge, return low confidence.\n\n" +
      (await datingKnowledge()),
    content: [
      { type: "text", text: "Date this garment from the tag/garment photos." },
      ...blocks,
    ],
    toolName: "report_dating",
    toolDescription: "Report the estimated decade with the cues used.",
    schema: {
      type: "object",
      properties: {
        decade: { type: "string", description: 'e.g. "1970s" or "circa late 1960s"' },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        cues: { type: "array", items: { type: "string" } },
        notableLabels: { type: "array", items: { type: "string" } },
      },
      required: ["decade", "confidence", "cues", "notableLabels"],
    },
    validate: (v): v is { decade: string; confidence: string; cues: string[]; notableLabels: string[] } =>
      isObj(v) && typeof v.decade === "string" && typeof v.confidence === "string",
    maxTokens: 1000,
  });

  return NextResponse.json(result);
}

async function handlePrice(body: Record<string, unknown>) {
  const facts = String(body.facts ?? "");
  const comps = String(body.comps ?? "");

  const result = await structuredCall({
    model: MODELS.writing,
    system:
      "You price vintage womenswear from SOLD/completed comps only. Ignore active asking " +
      "prices. Pasted comps are noisy (unsold relists, promoted junk, lots, wrong sizes) — " +
      "weight clean, comparable, recently-sold items. Apply the condition and rarity " +
      "adjustments. If comps are too thin, say so and widen the range.\n\n" +
      (await pricingKnowledge()),
    content: [
      { type: "text", text: `ITEM FACTS:\n${facts}\n\nPASTED SOLD COMPS:\n${comps || "(none provided)"}` },
    ],
    toolName: "report_price",
    toolDescription: "Suggest a price grounded in the comps.",
    schema: {
      type: "object",
      properties: {
        suggested: { type: ["number", "null"] },
        low: { type: ["number", "null"] },
        high: { type: ["number", "null"] },
        reasoning: { type: "string" },
      },
      required: ["suggested", "low", "high", "reasoning"],
    },
    validate: (v): v is { suggested: number | null; low: number | null; high: number | null; reasoning: string } =>
      isObj(v) && typeof v.reasoning === "string",
    maxTokens: 900,
  });

  return NextResponse.json(result);
}

async function handleWrite(body: Record<string, unknown>) {
  const facts = String(body.facts ?? "");

  const result = await structuredCall({
    model: MODELS.writing,
    system:
      "You write eBay listings for vintage womenswear. Produce an 80-char Cassini title " +
      "(brand + era + type + features + color + size, 1-2 era keywords max, no stuffing, no " +
      "ALL CAPS), a complete item-specifics set (fill every field you can justify; flag any " +
      "you can't), and a structured description (measurements block, condition with flaws " +
      "called out neutrally, features, fit/compare note). Only physically verifiable " +
      "descriptors. eBay item specifics vary by category — include the ones a buyer filters " +
      "on for this garment type and note any required field you lack data for.\n\n" +
      (await writingKnowledge()),
    content: [{ type: "text", text: `ITEM FACTS:\n${facts}` }],
    toolName: "report_listing",
    toolDescription: "Return the finished listing fields.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "<= 80 chars" },
        itemSpecifics: { type: "object", additionalProperties: { type: "string" } },
        description: { type: "string" },
      },
      required: ["title", "itemSpecifics", "description"],
    },
    validate: (v): v is { title: string; itemSpecifics: Record<string, string>; description: string } =>
      isObj(v) && typeof v.title === "string" && typeof v.description === "string" && isObj(v.itemSpecifics),
    maxTokens: 1800,
  });

  return NextResponse.json(result);
}
