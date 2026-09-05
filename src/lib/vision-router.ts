/**
 * Shared model-calling logic for /api/scan and /api/voice-log: both send a
 * menu-constrained prompt (optionally with a photo) and parse back a JSON
 * array of MEAL_LIBRARY ids. Two providers, tried in this order:
 *
 * 1. OpenAI direct (OPENAI_API_KEY) — a real, billable OpenAI key calling
 *    the Chat Completions API directly. Added because OmniRoute (below)
 *    is a self-hosted local proxy that needs its own separate service
 *    actually running at OMNIROUTE_BASE_URL; an OpenAI key alone does
 *    nothing for OmniRoute; it needs this separate, correctly-shaped path.
 * 2. OmniRoute (OMNIROUTE_API_KEY) — the original path, a proxy that
 *    speaks the Anthropic Messages API at /v1/messages so the underlying
 *    model can be swapped in one env var without touching request code.
 *
 * Neither configured: callers report "not configured" and fall back to
 * manual entry — this module never invents a match.
 */

export type MenuMatchResult =
  | { status: "ok"; ids: string[]; model: string }
  | { status: "not_configured" }
  | { status: "rate_limited"; retryAfter: number }
  /** Out of credits/quota — a billing problem, not a transient throttle.
   *  Distinguished from "rate_limited" because "wait a moment and retry"
   *  would be actively misleading here: retrying does nothing until the
   *  account is topped up. */
  | { status: "quota_exceeded"; detail: string }
  | { status: "error"; detail: string };

/** OpenAI's actual error shape: {"error": {"type": "...", "code": "...", "message": "..."}} */
function classifyOpenAIError(status: number, bodyText: string): MenuMatchResult {
  let parsed: { error?: { type?: string; code?: string; message?: string } } | null = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    /* fall through to the generic paths below */
  }
  const type = parsed?.error?.type;
  const code = parsed?.error?.code;
  if (type === "insufficient_quota" || code === "credit_balance_exhausted") {
    return {
      status: "quota_exceeded",
      detail: parsed?.error?.message ?? "This OpenAI project has no credits remaining.",
    };
  }
  if (status === 429) return { status: "rate_limited", retryAfter: 30 };
  return { status: "error", detail: bodyText.slice(0, 300) };
}

async function callOpenAI(promptText: string, image?: { mimeType: string; data: string }): Promise<MenuMatchResult> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";

  const content: unknown[] = [{ type: "text", text: promptText }];
  if (image) {
    content.push({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    return classifyOpenAIError(res.status, await res.text());
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return { status: "ok", ids: extractIds(text), model };
}

async function callOmniRoute(promptText: string, image?: { mimeType: string; data: string }): Promise<MenuMatchResult> {
  const base = process.env.OMNIROUTE_BASE_URL ?? "http://localhost:20128";
  const model = process.env.OMNIROUTE_VISION_MODEL ?? "oc/mimo-v2.5-free";
  const apiKey = process.env.OMNIROUTE_API_KEY!;

  const content: unknown[] = [{ type: "text", text: promptText, cache_control: { type: "ephemeral" } }];
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data } });
  }

  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 256, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429 || detail.includes("rate_limit")) return { status: "rate_limited", retryAfter: 30 };
    return { status: "error", detail: detail.slice(0, 300) };
  }

  const data = await res.json();
  const text: string = Array.isArray(data?.content)
    ? data.content
        .filter((b: { type?: string }) => b?.type === "text")
        .map((b: { text?: string }) => b.text ?? "")
        .join("")
    : "";
  return { status: "ok", ids: extractIds(text), model };
}

function extractIds(text: string): string[] {
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const list = JSON.parse(match[0]);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function matchAgainstMenu(
  promptText: string,
  image?: { mimeType: string; data: string }
): Promise<MenuMatchResult> {
  try {
    if (process.env.OPENAI_API_KEY) return await callOpenAI(promptText, image);
    if (process.env.OMNIROUTE_API_KEY) return await callOmniRoute(promptText, image);
    return { status: "not_configured" };
  } catch (err) {
    return { status: "error", detail: String(err).slice(0, 200) };
  }
}
