import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";

/**
 * Meal recognition from a photograph.
 *
 * Routed through OmniRoute rather than calling a provider directly, so the
 * model can be swapped in one env var without touching this file. OmniRoute
 * speaks the Anthropic Messages API at /v1/messages.
 *
 * Only `oc/mimo-v2.5-free` is both vision-capable and has live credentials on
 * the current OmniRoute instance: the anthropic and openai providers have no
 * credentials configured, and the `aug/*` models need the Auggie CLI.
 *
 * If OmniRoute is unreachable or unconfigured this returns 503 and the client
 * falls back to tapping dishes by hand, which still produces an exact calorie
 * count from real macro data. It never invents results: a wrong calorie number
 * is worse than no number.
 */

const BASE = process.env.OMNIROUTE_BASE_URL ?? "http://localhost:20128";
const MODEL = process.env.OMNIROUTE_VISION_MODEL ?? "oc/mimo-v2.5-free";

export async function POST(request: Request) {
  /* Each scan costs a model call, so this is the endpoint most worth
     protecting: an unthrottled loop bills you, not the attacker. */
  const gate = rateLimit(`scan:${clientIp(request)}`, { limit: 12, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const token = process.env.OMNIROUTE_API_KEY;
  if (!token) {
    return Response.json(
      {
        configured: false,
        reason:
          "OMNIROUTE_API_KEY is not set on the server, so automatic recognition is off. Identify the dishes by hand: the calorie count is exact either way.",
      },
      { status: 503 }
    );
  }

  /* The client already downscales to ~900px, so 6MB is generous. Without a
     cap, one 50MB base64 payload can pin the process. */
  const parsed = await readJsonCapped<{ image?: string; mimeType?: string }>(
    request,
    6 * 1024 * 1024
  );
  if (!parsed.ok) return parsed.response;

  const { image, mimeType = "image/jpeg" } = parsed.data;
  if (!image) {
    return Response.json({ error: "No image supplied." }, { status: 400 });
  }
  /* Only accept image types we asked for: do not forward arbitrary strings
     into the upstream request. */
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return Response.json({ error: "Unsupported image type." }, { status: 400 });
  }

  /* Constrain the model to dishes we hold real macros for. Anything it
     invents outside this list is dropped below. */
  const menu = MEAL_LIBRARY.map((m) => `${m.id}: ${m.name.en}`).join("\n");
  const prompt = `You are looking at a photograph of an Indian meal.
Identify which of these known dishes appear on the plate.

${menu}

Reply with ONLY a JSON array of matching ids, most confident first, e.g.
["poha","dahi"]. If nothing on the list is visible, reply with [].
Do not include any dish that is not on the list. Do not add commentary.`;

  try {
    const res = await fetch(`${BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": token,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: image },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const detail = await res.text();
      /* Free models rate-limit hard and it is transient, so say so plainly
         rather than reporting it as a rejection the user can't act on. */
      if (res.status === 429 || detail.includes("rate_limit")) {
        return Response.json(
          {
            configured: true,
            retryable: true,
            reason:
              "The vision model is rate limited right now. Wait a moment and take the photo again, or just tap the dishes: the calorie count is exact either way.",
          },
          { status: 429, headers: { "Retry-After": "30" } }
        );
      }
      return Response.json(
        { error: "The vision model rejected the request.", detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = await res.json();
    /* Anthropic returns content blocks; thinking models emit a `thinking`
       block first, so join only the text blocks. */
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: { type?: string }) => b?.type === "text")
          .map((b: { text?: string }) => b.text ?? "")
          .join("")
      : "";

    const match = text.match(/\[[\s\S]*?\]/);
    let ids: string[] = [];
    if (match) {
      try {
        const list = JSON.parse(match[0]);
        if (Array.isArray(list)) ids = list.filter((x): x is string => typeof x === "string");
      } catch {
        /* fall through to an empty result rather than guessing */
      }
    }

    const known = new Set(MEAL_LIBRARY.map((m) => m.id));
    return Response.json({
      configured: true,
      model: MODEL,
      ids: ids.filter((id) => known.has(id)),
    });
  } catch (err) {
    return Response.json(
      { error: "Could not reach the vision model.", detail: String(err).slice(0, 200) },
      { status: 502 }
    );
  }
}
