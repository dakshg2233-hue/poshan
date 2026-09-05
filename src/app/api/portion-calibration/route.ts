import { NextResponse, type NextRequest } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";
import { askVision } from "@/lib/vision-router";

/**
 * Portion-size calibration from a single photo: a bowl or plate next to
 * a ₹10 coin (a fixed, known 27mm diameter — a real, standardised
 * reference object, not an arbitrary one). The model compares the two
 * and classifies the bowl into one of four size bands relative to a
 * "standard katori" rather than returning a free-form measurement —
 * constrained the same way /api/scan constrains dish matching to a known
 * list, so a wrong guess is a wrong *band*, not an arbitrary number.
 *
 * This never changes which dish gets recommended — only how the
 * displayed kcal total is annotated for this specific person's actual
 * bowl size (see profiles.portion_scale). An honest estimate, stated as
 * one: not a lab measurement.
 */

const BANDS = [0.75, 1.0, 1.25, 1.5] as const;

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;

  const gate = rateLimit(`portion-cal:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  if (!process.env.OPENAI_API_KEY && !process.env.OMNIROUTE_API_KEY) {
    return NextResponse.json(
      { configured: false, reason: "No vision model is configured, so calibration is off. The standard portion size will be used." },
      { status: 503 }
    );
  }

  const parsed = await readJsonCapped<{ image?: string; mimeType?: string }>(request, 6 * 1024 * 1024);
  if (!parsed.ok) return parsed.response;

  const { image, mimeType = "image/jpeg" } = parsed.data;
  if (!image) return NextResponse.json({ error: "No image supplied." }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  const prompt = `This photograph shows a bowl or plate of food next to an Indian ₹10 coin, placed for scale. The ₹10 coin has a fixed, known diameter of 27mm.

Compare the bowl/plate's visible diameter to the coin to estimate its size relative to a standard Indian "katori" (a standard katori is roughly 9-10cm in diameter, holding about 150-200ml).

Reply with ONLY a JSON object, no commentary:
{"band": <one of 0.75, 1.0, 1.25, 1.5>, "note": "<one short sentence explaining the comparison>"}

Use 0.75 if the bowl looks noticeably smaller than standard, 1.0 if it looks about standard size, 1.25 if noticeably larger, 1.5 if much larger (e.g. a large serving bowl, not a katori at all).

If the ₹10 coin is not clearly visible in the photo, reply with exactly: {"error": "coin not visible"}`;

  const result = await askVision(prompt, { mimeType, data: image });

  switch (result.status) {
    case "not_configured":
      return NextResponse.json(
        { configured: false, reason: "No vision model is configured, so calibration is off." },
        { status: 503 }
      );
    case "rate_limited":
      return NextResponse.json(
        { configured: true, retryable: true, reason: "The vision model is rate limited right now. Try again in a moment." },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
      );
    case "quota_exceeded":
      return NextResponse.json(
        { configured: true, retryable: false, reason: "The vision model's account is out of credits right now." },
        { status: 503 }
      );
    case "error":
      return NextResponse.json({ error: "The vision model rejected the request.", detail: result.detail }, { status: 502 });
    case "ok": {
      const match = result.text.match(/\{[\s\S]*?\}/);
      if (!match) {
        return NextResponse.json(
          { configured: true, matched: false, reason: "Couldn't read a size estimate from that photo. Try again with the coin clearly visible." },
          { status: 200 }
        );
      }
      try {
        const parsedJson = JSON.parse(match[0]);
        if (parsedJson.error) {
          return NextResponse.json(
            { configured: true, matched: false, reason: "Couldn't see the ₹10 coin clearly. Place it flat next to the bowl and try again." },
            { status: 200 }
          );
        }
        const band = BANDS.includes(parsedJson.band) ? parsedJson.band : 1.0;
        return NextResponse.json({
          configured: true,
          matched: true,
          suggestedScale: band,
          note: typeof parsedJson.note === "string" ? parsedJson.note.slice(0, 200) : "",
        });
      } catch {
        return NextResponse.json(
          { configured: true, matched: false, reason: "Couldn't read a size estimate from that photo. Try again." },
          { status: 200 }
        );
      }
    }
  }
}
