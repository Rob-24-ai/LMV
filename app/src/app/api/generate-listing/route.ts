import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, structuredCall } from "@/lib/anthropic.server";
import { maxMode, claudeStructured, writeTempImages } from "@/lib/claude-bridge.server";
import { datingKnowledge, pricingKnowledge, writingKnowledge } from "@/lib/reference.server";

export const runtime = "nodejs";
export const maxDuration = 300;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

// --- schemas (shared by both backends) ---
const ANALYZE_SCHEMA = {
  type: "object",
  properties: {
    brand: { type: "string", description: "Brand from the label, or 'Unbranded' if none visible. Do not guess." },
    garmentType: { type: "string" },
    color: { type: "string" },
    material: { type: "string", description: "From the content tag if visible, else best read of the fabric." },
    pattern: { type: "string" },
    neckline: { type: "string" },
    sleeveType: { type: "string" },
    closure: { type: "string", description: "zipper type/placement, buttons, etc." },
    styleKeywords: { type: "array", items: { type: "string" } },
    decade: { type: "string" },
    decadeConfidence: { type: "string", enum: ["low", "medium", "high"] },
    cues: { type: "array", items: { type: "string" }, description: "The dating cues you actually observed." },
    notableLabels: { type: "array", items: { type: "string" } },
    estimatedValueLow: { type: ["number", "null"] },
    estimatedValueHigh: { type: ["number", "null"] },
    valueNote: { type: "string", description: "One line on what drives value and what to confirm with sold comps." },
  },
  required: ["garmentType", "color", "decade", "decadeConfidence", "cues", "styleKeywords"],
} as const;

const PRICE_SCHEMA = {
  type: "object",
  properties: {
    suggested: { type: ["number", "null"] },
    low: { type: ["number", "null"] },
    high: { type: ["number", "null"] },
    reasoning: { type: "string" },
  },
  required: ["suggested", "low", "high", "reasoning"],
} as const;

const WRITE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    itemSpecifics: { type: "object", additionalProperties: { type: "string" } },
    description: { type: "string" },
  },
  required: ["title", "itemSpecifics", "description"],
} as const;

const MEASURE_FIELD_KEYS = ["bust", "waist", "hips", "length", "shoulder", "sleeve", "rise", "inseam"] as const;
const MEASURE_SCHEMA = {
  type: "object",
  properties: {
    reads: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: MEASURE_FIELD_KEYS },
          value: {
            type: ["number", "null"],
            description: "Inches to the nearest 0.25, read where the garment edge meets the tape. null if a tape is present but the number/endpoint isn't legible.",
          },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          note: { type: "string", description: "Short reason when confidence is not high (e.g. 'cuff end out of frame')." },
        },
        required: ["field", "value", "confidence"],
      },
    },
  },
  required: ["reads"],
} as const;

const validAnalyze = (v: unknown): v is Record<string, unknown> =>
  isObj(v) && typeof v.garmentType === "string" && typeof v.decade === "string";
const validPrice = (v: unknown): v is { suggested: number | null; low: number | null; high: number | null; reasoning: string } =>
  isObj(v) && typeof v.reasoning === "string";
const validWrite = (v: unknown): v is { title: string; itemSpecifics: Record<string, string>; description: string } =>
  isObj(v) && typeof v.title === "string" && typeof v.description === "string" && isObj(v.itemSpecifics);
const validMeasure = (v: unknown): v is { reads: unknown[] } => isObj(v) && Array.isArray(v.reads);

const ANALYZE_SYS = (kb: string) =>
  "You are an expert vintage womenswear specialist. Look at every photo and read the garment " +
  "directly: identify brand (from the label only — never invent one), garment type, color, " +
  "material, pattern, neckline, sleeve type, closure, and style. Date it using the cue guide, " +
  "using at least 3 observed cues; if they don't converge, say low confidence. Give a rough " +
  "resale value range from the brand tier and comparables in your knowledge, and note it's an " +
  "estimate to confirm against sold comps. Only report what you can actually see — leave a " +
  "field blank rather than guessing.\n\n" + kb;
const PRICE_SYS = (kb: string) =>
  "You price vintage womenswear from SOLD/completed comps only. Ignore active asking prices. " +
  "Pasted comps are noisy (unsold relists, promoted junk, lots, wrong sizes) — weight clean, " +
  "comparable, recently-sold items. Apply the condition and rarity adjustments. If comps are " +
  "too thin, say so and widen the range.\n\n" + kb;
const WRITE_SYS = (kb: string) =>
  "You write complete, polished eBay listings for vintage womenswear. Look at the photos and " +
  "the provided facts and write the whole thing yourself.\n\n" +
  "RULES:\n" +
  "- Produce an 80-char Cassini title: brand + era + type + key features + color + size. 1-2 " +
  "era keywords max, no stuffing, no ALL CAPS.\n" +
  "- Fill EVERY item specific you can determine from the photos or facts. Read necklines, " +
  "sleeves, closures, pattern, color, material from the images.\n" +
  "- NEVER write placeholder text, brackets, or flag markers ('not provided', 'fill from " +
  "photo', 'confirm from label', '[add ...]', etc.) anywhere in the title, specifics, or " +
  "description. If you genuinely cannot determine a field, simply omit it. The output must read " +
  "like a finished, ready-to-post listing a buyer sees — never a worksheet.\n" +
  "- Description: a natural, well-phrased paragraph or two that sells the piece honestly, plus " +
  "the measurements (only those provided) and an honest condition line naming any flaws " +
  "neutrally. Do not fabricate measurements.\n" +
  "- Only physically verifiable descriptors. eBay item specifics vary by category — include the " +
  "ones a buyer filters on for this garment type.\n\n" + kb;
const MEASURE_SYS =
  "You read flat garment measurements off a soft tape measure laid on the garment in each photo. " +
  "For each photo, work out which dimension the tape spans and read the number on the tape at the " +
  "point where the garment edge ends:\n" +
  "- bust = pit-to-pit (armpit seam to armpit seam)\n" +
  "- waist = narrowest point, flat\n" +
  "- hips = fullest point below the waist, flat\n" +
  "- length = shoulder seam (or top) straight down to the hem\n" +
  "- shoulder = seam to seam across the back\n" +
  "- sleeve = shoulder seam to the end of the cuff\n" +
  "- rise = crotch seam to top of waistband (bottoms)\n" +
  "- inseam = crotch seam to leg hem (bottoms)\n\n" +
  "These are FLAT measurements: report the number shown on the tape as-is. Do NOT double pit-to-pit, " +
  "waist, or hips. Read to the nearest 0.25 inch.\n\n" +
  "RULES:\n" +
  "- Only report a dimension when a tape is clearly laid along it AND you can actually read the end " +
  "number. Set confidence by how legibly you can read the number and see both endpoints.\n" +
  "- If a tape is present but the number or an endpoint is unclear, return value null with a short " +
  "note saying why. NEVER guess a number you cannot read off the tape.\n" +
  "- Return one entry per dimension you can identify across the photos; omit dimensions with no tape on them.\n" +
  "- If the tape shows centimeters, convert to inches (1 in = 2.54 cm) and note that you converted.";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  try {
    if (body.action === "analyze") return await handleAnalyze(body);
    if (body.action === "price") return await handlePrice(body);
    if (body.action === "write") return await handleWrite(body);
    if (body.action === "measure") return await handleMeasure(body);
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// Run a vision+text structured call through whichever backend is active.
async function visionStructured<T>(opts: {
  model: string;
  system: string;
  instruction: string;
  images: string[];
  schema: object;
  validate: (v: unknown) => v is T;
  toolName: string;
  maxTokens: number;
}): Promise<T> {
  if (maxMode()) {
    const { dir, paths, cleanup } = await writeTempImages(opts.images);
    try {
      const prompt =
        `${opts.instruction}\n\nImage files to read:\n` + paths.map((p) => `- ${p}`).join("\n");
      return await claudeStructured({
        model: opts.model,
        system: opts.system,
        prompt,
        schema: opts.schema,
        validate: opts.validate,
        imageDir: dir,
      });
    } finally {
      await cleanup();
    }
  }
  const blocks = opts.images
    .map((d) => {
      const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(d);
      return m
        ? ({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } as Anthropic.Messages.ImageBlockParam)
        : null;
    })
    .filter(Boolean) as Anthropic.Messages.ImageBlockParam[];
  return structuredCall({
    model: opts.model,
    system: opts.system,
    content: [{ type: "text", text: opts.instruction }, ...blocks],
    toolName: opts.toolName,
    toolDescription: "Return the structured result.",
    schema: opts.schema as unknown as Anthropic.Messages.Tool.InputSchema,
    validate: opts.validate,
    maxTokens: opts.maxTokens,
  });
}

async function handleAnalyze(body: Record<string, unknown>) {
  const images = Array.isArray(body.images) ? (body.images as string[]) : [];
  if (images.length === 0) return NextResponse.json({ error: "Add at least one photo first." }, { status: 400 });
  const result = await visionStructured({
    model: MODELS.dating,
    system: ANALYZE_SYS(await datingKnowledge()),
    instruction:
      "Analyze this vintage garment from the photos. Identify it, date it, and estimate value.",
    images,
    schema: ANALYZE_SCHEMA,
    validate: validAnalyze,
    toolName: "report_analysis",
    maxTokens: 1400,
  });
  return NextResponse.json(result);
}

async function handleMeasure(body: Record<string, unknown>) {
  const images = Array.isArray(body.images) ? (body.images as string[]) : [];
  if (images.length === 0)
    return NextResponse.json({ error: "Add measurement shots first — tape laid along each dimension." }, { status: 400 });
  const result = await visionStructured({
    model: MODELS.dating,
    system: MEASURE_SYS,
    instruction:
      "Read the tape-measure value for each dimension shown in these photos. Report only what you can actually read off the tape.",
    images,
    schema: MEASURE_SCHEMA,
    validate: validMeasure,
    toolName: "report_measurements",
    maxTokens: 1000,
  });
  return NextResponse.json(result);
}

async function handleWrite(body: Record<string, unknown>) {
  const facts = String(body.facts ?? "");
  const images = Array.isArray(body.images) ? (body.images as string[]) : [];
  const instruction = `Write the complete listing. Look at the photos and use these facts:\n${facts}`;

  if (images.length > 0) {
    const result = await visionStructured({
      model: MODELS.writing,
      system: WRITE_SYS(await writingKnowledge()),
      instruction,
      images,
      schema: WRITE_SCHEMA,
      validate: validWrite,
      toolName: "report_listing",
      maxTokens: 2000,
    });
    return NextResponse.json(result);
  }

  // No photos: text-only fallback.
  const kb = await writingKnowledge();
  if (maxMode()) {
    const result = await claudeStructured({
      model: MODELS.writing,
      system: WRITE_SYS(kb),
      prompt: instruction,
      schema: WRITE_SCHEMA,
      validate: validWrite,
    });
    return NextResponse.json(result);
  }
  const result = await structuredCall({
    model: MODELS.writing,
    system: WRITE_SYS(kb),
    content: [{ type: "text", text: instruction }],
    toolName: "report_listing",
    toolDescription: "Return the finished listing fields.",
    schema: WRITE_SCHEMA as unknown as Anthropic.Messages.Tool.InputSchema,
    validate: validWrite,
    maxTokens: 2000,
  });
  return NextResponse.json(result);
}

async function handlePrice(body: Record<string, unknown>) {
  const facts = String(body.facts ?? "");
  const comps = String(body.comps ?? "");
  const kb = await pricingKnowledge();
  const prompt = `ITEM FACTS:\n${facts}\n\nPASTED SOLD COMPS:\n${comps || "(none provided)"}`;

  if (maxMode()) {
    const result = await claudeStructured({
      model: MODELS.writing,
      system: PRICE_SYS(kb),
      prompt,
      schema: PRICE_SCHEMA,
      validate: validPrice,
    });
    return NextResponse.json(result);
  }
  const result = await structuredCall({
    model: MODELS.writing,
    system: PRICE_SYS(kb),
    content: [{ type: "text", text: prompt }],
    toolName: "report_price",
    toolDescription: "Suggest a price grounded in the comps.",
    schema: PRICE_SCHEMA as unknown as Anthropic.Messages.Tool.InputSchema,
    validate: validPrice,
    maxTokens: 900,
  });
  return NextResponse.json(result);
}
