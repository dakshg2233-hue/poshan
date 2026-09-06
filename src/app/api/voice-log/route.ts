import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";
import { matchAgainstMenu } from "@/lib/vision-router";

/**
 * Matches a spoken/typed description of a meal (Hindi or English — the
 * transcript comes from the browser's own Web Speech API, not from
 * anything server-side) against MEAL_LIBRARY, the same constrained-menu
 * approach /api/scan uses for a photo (see src/lib/vision-router.ts for
 * the two provider paths): the model can only return ids from the list
 * it's given, so it cannot invent a dish that isn't real data.
 * Unauthenticated by design, same as /api/scan — matching a dish doesn't
 * touch any account data; logging the result does, via /api/daily.
 */
export async function POST(request: Request) {
  const gate = rateLimit(`voice-log:${clientIp(request)}`, { limit: 15, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  if (!process.env.OPENAI_API_KEY && !process.env.OMNIROUTE_API_KEY) {
    return Response.json(
      { configured: false, reason: "No matching model is configured. Log by hand from the meal list instead." },
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

  const result = await matchAgainstMenu(prompt);

  switch (result.status) {
    case "not_configured":
      return Response.json(
        { configured: false, reason: "No matching model is configured. Log by hand from the meal list instead." },
        { status: 503 }
      );
    case "rate_limited":
      return Response.json(
        { configured: true, retryable: true, reason: "The matching model is rate limited right now. Try again in a moment." },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
      );
    case "quota_exceeded":
      return Response.json(
        { configured: true, retryable: false, reason: "The matching model's account is out of credits right now. Log by hand from the meal list instead." },
        { status: 503 }
      );
    case "error":
      return Response.json(
        { error: "The matching model rejected the request.", detail: result.detail },
        { status: 502 }
      );
    case "ok": {
      const known = new Set(MEAL_LIBRARY.map((m) => m.id));
      return Response.json({
        configured: true,
        model: result.model,
        ids: result.ids.filter((id) => known.has(id)),
      });
    }
  }
}
