import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";
import { askVision } from "@/lib/vision-router";
import { unitForDish, formatQty, type PortionUnit } from "@/lib/portion";

/**
 * Meal recognition from a photograph — every item on the plate, each with
 * a quantity and a stated confidence.
 *
 * This used to return a flat list of dish ids, which was the wrong shape
 * for how Indians eat. A thali is four or five things at once, and "dal:
 * 220 kcal" for a plate holding dal, two rotis, aloo sabzi and curd is not
 * an approximation of the answer — it is a different answer, off by three
 * times. The unit of recognition has to be the plate, not the dish.
 *
 * Confidence is returned because AI food recognition is not accurate
 * enough to be silent about it, and this is a health app: a number stated
 * flatly is a number the user will act on. Poshan says how sure it is and
 * lets the user fix it, which is both more honest and — because those
 * fixes are recorded — the only way the recognition gets better.
 *
 * Never invents results. Neither provider configured, or the model
 * unreachable: 503, and the client falls back to tapping dishes by hand,
 * which still produces an exact count from real macro data.
 */

type DetectedItem = {
  id: string;
  name: { en: string; hi: string };
  /** How many of `unit` — already rounded to something servable. */
  qty: number;
  unit: PortionUnit;
  confidence: "high" | "medium" | "low";
  kcal: number;
  macros: { protein: number; carbohydrate: number; fat: number; fibre: number };
  text: { en: string; hi: string };
};

/**
 * The model returns its own confidence, which is a self-report and
 * therefore optimistic. Downgrading one step before showing it to a user
 * is deliberate: an over-confident wrong portion is the failure that costs
 * trust permanently, and an under-confident right one costs a tap.
 */
const DOWNGRADE: Record<string, "high" | "medium" | "low"> = {
  high: "medium",
  medium: "low",
  low: "low",
};

/** Halves and quarters only — nobody serves 0.3 of a katori. */
function servable(qty: number): number {
  if (!Number.isFinite(qty) || qty <= 0) return 1;
  if (qty < 0.375) return 0.25;
  if (qty >= 3) return Math.min(Math.round(qty), 10);
  return Math.round(qty * 2) / 2;
}

function parseItems(text: string): { id: string; qty: number; confidence: string }[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const list = JSON.parse(match[0]);
    if (!Array.isArray(list)) return [];
    return list
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .map((x) => ({
        id: typeof x.id === "string" ? x.id : "",
        qty: typeof x.qty === "number" ? x.qty : 1,
        confidence: typeof x.confidence === "string" ? x.confidence.toLowerCase() : "low",
      }))
      .filter((x) => x.id !== "");
  } catch {
    return [];
  }
}

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
  const parsed = await readJsonCapped<{ image?: string; mimeType?: string; portionScale?: number }>(
    request,
    6 * 1024 * 1024
  );
  if (!parsed.ok) return parsed.response;

  const { image, mimeType = "image/jpeg", portionScale = 1 } = parsed.data;
  if (!image) {
    return Response.json({ error: "No image supplied." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return Response.json({ error: "Unsupported image type." }, { status: 400 });
  }

  /* Constrain the model to dishes we hold real macros for. Anything it
     invents outside this list is dropped below. */
  const menu = MEAL_LIBRARY.map((m) => `${m.id}: ${m.name.en}`).join("\n");

  const prompt = `You are looking at a photograph of an Indian meal. Identify EVERY dish visible on the plate or thali, not just the main one — a thali typically holds 3 to 5 separate items.

Known dishes (use these ids only):
${menu}

For each dish you can see, estimate:
- "id": the dish id from the list above
- "qty": how many standard Indian servings are visible. A standard serving is one katori (small steel bowl, ~150ml) for dal/sabzi/curd/curry, one roti/chapati, one piece for idli/vada/samosa/dosa, one glass for drinks. Use 0.5 for a half portion, 2 for two rotis, and so on.
- "confidence": "high" if the dish is clearly and unambiguously identifiable, "medium" if it is probably right but could be a similar dish, "low" if you are guessing from colour or shape alone.

Be honest about confidence. Indian curries look alike; if you cannot distinguish dal from sambar, say "low". Do not include a dish that is not on the list. Do not include a dish you cannot actually see.

Reply with ONLY a JSON array, e.g.
[{"id":"dal","qty":1,"confidence":"high"},{"id":"roti","qty":2,"confidence":"high"},{"id":"dahi","qty":0.5,"confidence":"medium"}]
No commentary.`;

  const result = await askVision(prompt, { mimeType, data: image });

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
          reason:
            "The vision model's account is out of credits, so automatic recognition is off for now. Identify the dishes by hand: the calorie count is exact either way.",
        },
        { status: 503 }
      );
    case "error":
      return Response.json(
        { error: "The vision model rejected the request.", detail: result.detail },
        { status: 502 }
      );
    case "ok": {
      const byId = new Map(MEAL_LIBRARY.map((m) => [m.id, m]));
      const safeScale = portionScale > 0.1 && portionScale < 4 ? portionScale : 1;

      const items: DetectedItem[] = [];
      for (const raw of parseItems(result.text)) {
        const meal = byId.get(raw.id);
        if (!meal) continue; // dropped: not a dish we hold real macros for
        if (items.some((i) => i.id === meal.id)) continue; // model repeated itself

        const qty = servable(raw.qty);
        const confidence =
          DOWNGRADE[raw.confidence] ?? ("low" as const);

        /* Energy scales with both the quantity seen and the user's own
           calibrated katori — a 1.25 katori holds a quarter more than the
           reference the dish's kcal was recorded against. */
        const kcal = Math.round(meal.kcal * qty * safeScale);
        const scale = qty * safeScale;
        const unit = unitForDish(meal);

        items.push({
          id: meal.id,
          name: meal.name,
          qty,
          unit,
          confidence,
          kcal,
          macros: {
            protein: Math.round(meal.macros.protein * scale),
            carbohydrate: Math.round(meal.macros.carbohydrate * scale),
            fat: Math.round(meal.macros.fat * scale),
            fibre: Math.round(meal.macros.fibre * scale),
          },
          text: {
            en: formatQty(qty, unit, "en"),
            hi: formatQty(qty, unit, "hi"),
          },
        });
      }

      const totals = items.reduce(
        (acc, i) => ({
          kcal: acc.kcal + i.kcal,
          protein: acc.protein + i.macros.protein,
          carbohydrate: acc.carbohydrate + i.macros.carbohydrate,
          fat: acc.fat + i.macros.fat,
          fibre: acc.fibre + i.macros.fibre,
        }),
        { kcal: 0, protein: 0, carbohydrate: 0, fat: 0, fibre: 0 }
      );

      /* The plate is only as certain as its least certain item. Averaging
         would let three confident rotis hide one wild guess at the curry
         that carries most of the calories. */
      const plateConfidence: "high" | "medium" | "low" = items.some((i) => i.confidence === "low")
        ? "low"
        : items.some((i) => i.confidence === "medium")
          ? "medium"
          : "high";

      return Response.json({
        configured: true,
        model: result.model,
        items,
        totals,
        plateConfidence,
        /* Kept so the older single-list client keeps working while the new
           scanner UI rolls out. */
        ids: items.map((i) => i.id),
      });
    }
  }
}
