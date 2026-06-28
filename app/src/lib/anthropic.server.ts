// Anthropic client + a structured-output helper with validate-and-retry.
// Model tiering: dating needs vision + judgment (strong model); price/write are
// well within Sonnet. Override via env if needed.
import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  dating: process.env.LMV_MODEL_DATING || "claude-opus-4-8",
  writing: process.env.LMV_MODEL_WRITING || "claude-sonnet-4-6",
} as const;

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

type Block = Anthropic.Messages.ContentBlockParam;

// Force a single tool call and return its validated input. Retries once on a
// malformed/missing tool call so the UI never gets a blank result silently.
export async function structuredCall<T>(opts: {
  model: string;
  system: string;
  content: Block[];
  toolName: string;
  toolDescription: string;
  schema: Anthropic.Messages.Tool.InputSchema;
  validate: (v: unknown) => v is T;
  maxTokens?: number;
}): Promise<T> {
  const { model, system, content, toolName, toolDescription, schema, validate } = opts;

  async function attempt(): Promise<T | null> {
    const res = await anthropic().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      system,
      tools: [{ name: toolName, description: toolDescription, input_schema: schema }],
      tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content }],
    });
    const tool = res.content.find((b) => b.type === "tool_use");
    if (tool && tool.type === "tool_use" && validate(tool.input)) {
      return tool.input;
    }
    return null;
  }

  const first = await attempt();
  if (first) return first;
  const second = await attempt();
  if (second) return second;
  throw new Error(`Model did not return valid ${toolName} output after retry`);
}
