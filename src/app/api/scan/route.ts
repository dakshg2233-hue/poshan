import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";
import { matchAgainstMenu } from "@/lib/vision-router";

/**
 * Meal recognition from a photograph.
 *
 * Tries OpenAI direct first (OPENAI_API_KEY), then OmniRoute
 * (OMNIROUTE_API_KEY) — see src/lib/vision-router.ts for why there are two
 * paths. Neither configured, or the model unreachable: this returns 503
 * and the client falls back to tapping dishes by hand, which still
 * produces an exact calorie count from real macro data. It never invents
 * results: a wrong calorie number is worse than no number.
 */
export async function POST(request: Request) {
  /* Each scan costs a model call, so this is the endpoint most worth
     protecting: an unthrottled loop bills you, not the attacker. */
  const gate = rateLimit(`scan:${clientIp(request)}`, { limit: 12, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  if (!process.env.OPENAI_API_KEY && !process.env.OMNIROUTE_API_KEY) {
    return Response.json(
      {
        configured: false,
        reason:
          "No vision model is configured on the server, so automatic recognition is off. Identify the dishes by hand: the calorie count is exact either way.",
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

  const result = await matchAgainstMenu(prompt, { mimeType, data: image });

  switch (result.status) {
    case "not_configured":
      return Response.json(
        { configured: false, reason: "The vision model isn't configured. Identify the dishes by hand instead." },
        { status: 503 }
      );
    case "rate_limited":
      return Response.json(
        {
          configured: true,
          retryable: true,
          reason:
            "The vision model is rate limited right now. Wait a moment and take the photo again, or just tap the dishes: the calorie count is exact either way.",
        },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
      );
    case "quota_exceeded":
      return Response.json(
        {
          configured: true,
          retryable: false,
          reason: "The vision model's account is out of credits, so automatic recognition is off for now. Identify the dishes by hand: the calorie count is exact either way.",
        },
        { status: 503 }
      );
    case "error":
      return Response.json(
        { error: "The vision model rejected the request.", detail: result.detail },
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
