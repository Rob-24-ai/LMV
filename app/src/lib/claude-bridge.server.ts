// "Max mode" backend: shell out to the local `claude` CLI (Claude Code) in
// print mode so calls run off Rob's Claude Max OAuth at $0, no API key. Used
// whenever ANTHROPIC_API_KEY is absent. Same structured-output contract as the
// SDK path: forced JSON via --json-schema, validate, one retry.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileP = promisify(execFile);
const CLAUDE_BIN = process.env.LMV_CLAUDE_BIN || "claude";

export function maxMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}

interface Envelope {
  is_error?: boolean;
  result?: string;
}

async function runOnce(args: string[]): Promise<unknown> {
  const { stdout } = await execFileP(CLAUDE_BIN, args, {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 180_000,
    env: process.env,
  });
  const env = JSON.parse(stdout) as Envelope;
  if (env.is_error) throw new Error(env.result || "claude CLI error");
  if (!env.result) throw new Error("claude CLI returned no result");
  return JSON.parse(env.result);
}

export async function claudeStructured<T>(opts: {
  model: string;
  system: string;
  prompt: string;
  schema: object;
  validate: (v: unknown) => v is T;
  // Absolute image file paths to make readable for the (vision) dating call.
  imageDir?: string;
}): Promise<T> {
  const base = [
    "-p",
    opts.prompt,
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(opts.schema),
    "--append-system-prompt",
    opts.system,
    "--model",
    opts.model,
  ];
  if (opts.imageDir) {
    base.push(
      "--add-dir",
      opts.imageDir,
      "--allowedTools",
      "Read",
      "--permission-mode",
      "bypassPermissions",
    );
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = await runOnce(base);
      if (opts.validate(parsed)) return parsed;
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  throw new Error("claude CLI did not return valid structured output after retry");
}

// Writes data URLs to a temp dir and returns the dir + file paths so the dating
// prompt can point the CLI's Read tool at real image files.
export async function writeTempImages(
  dataUrls: string[],
): Promise<{ dir: string; paths: string[]; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "lmv-img-"));
  const paths: string[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const m = /^data:image\/(jpeg|png|webp|gif);base64,(.+)$/.exec(dataUrls[i]);
    if (!m) continue;
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const path = join(dir, `tag-${i}.${ext}`);
    await writeFile(path, Buffer.from(m[2], "base64"));
    paths.push(path);
  }
  return { dir, paths, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
