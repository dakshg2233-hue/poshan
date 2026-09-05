import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";

/**
 * Matches a spoken/typed description of a meal (Hindi or English — the
 * transcript comes from the browser's own Web Speech API, not from
 * anything server-side) against MEAL_LIBRARY, the same constrained-menu
 * approach /api/scan uses for a photo: the model can only return ids from
 * the list it's given, so it cannot invent a dish that isn't real data.
 * Unauthenticated by design, same as /api/scan — matching a dish doesn't
 * touch any account data; logging the result does, via /api/daily.
 */

const BASE = process.env.OMNIROUTE_BASE_URL ?? "http://localhost:20128";
const MODEL = process.env.OMNIROUTE_VISION_MODEL ?? "oc/mimo-v2.5-free";

export async function POST(request: Request) {
  const gate = rateLimit(`voice-log:${clientIp(request)}`, { limit: 15, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const token = process.env.OMNIROUTE_API_KEY;
  if (!token) {
    return Response.json(
      {
        configured: false,
        reason: "OMNIROUTE_API_KEY is not set on the server, so voice matching is off. Log by hand from the meal list instead.",
      },
      { status: 503 }
    );
  }

  const parsed = await readJsonCapped<{ transcript?: string; meal_time?: string }>(request, 4_096);
  if (!parsed.ok) return parsed.response;

  const transcript = parsed.data.transcript?.trim();
  if (!transcript) {
    return Response.json({ error: "No transcript supplied." }, { status: 400 });
  }
  if (transcript.length > 500) {
    return Response.json({ error: "That transcript is too long." }, { status: 400 });
  }

  /* Narrowing the menu to the declared meal-time both shrinks the prompt
     and makes a wrong match less likely — "poha" said at breakfast has far
     fewer plausible neighbours than "poha" against the whole library. */
  const validTimes = ["breakfast", "lunch", "dinner", "snack"];
  const scope = validTimes.includes(parsed.data.meal_time ?? "")
    ? MEAL_LIBRARY.filter((m) => m.time === parsed.data.meal_time)
    : MEAL_LIBRARY;

  const menu = scope.map((m) => `${m.id}: ${m.name.en} / ${m.name.hi}`).join("\n");
  const prompt = `A user spoke or typed, in Hindi or English, what they just ate:
"${transcript}"

Here is the list of known dishes:
${menu}

Reply with ONLY a JSON array of matching dish ids, most confident first, e.g.
["poha","dahi"]. If nothing on the list plausibly matches, reply with [].
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
            content: [{ type: "text", text: prompt, cache_control: { type: "ephemeral" } }],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 429 || detail.includes("rate_limit")) {
        return Response.json(
          { configured: true, retryable: true, reason: "The matching model is rate limited right now. Try again in a moment." },
          { status: 429, headers: { "Retry-After": "30" } }
        );
      }
      return Response.json({ error: "The matching model rejected the request.", detail: detail.slice(0, 300) }, { status: 502 });
    }

    const data = await res.json();
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
        /* fall through to an empty result */
      }
    }

    const known = new Set(MEAL_LIBRARY.map((m) => m.id));
    return Response.json({ configured: true, model: MODEL, ids: ids.filter((id) => known.has(id)) });
  } catch (err) {
    return Response.json({ error: "Could not reach the matching model.", detail: String(err).slice(0, 200) }, { status: 502 });
  }
}
