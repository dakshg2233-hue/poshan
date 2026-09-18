import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import Anthropic from "@anthropic-ai/sdk";
import { serviceClient } from "@/lib/supabase";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";
import { buildNutritionContext, buildHealthContext } from "@/lib/chat-knowledge";
import { checkAiSafety, gateAiReply, SAFE_REPLACEMENT } from "@/lib/ai-safety";
import { startOfTodayIso } from "@/lib/day";

/**
 * Both chatbots — "Ask Poshan" (food/nutrition) and "Health Companion"
 * (condition-focused guidance) — go through this one route, distinguished
 * by `chatbot` in the request body. Shared: auth, the 15/day free quota,
 * history storage, and the honesty rules in the system prompt.
 *
 * Free tier: 15 messages/day, shared across both chatbots, resets at UTC
 * midnight in IST (see `startOfTodayIso`). Any subscription row in "trialing" or
 * "active" status — any product, not just Poshan Home — gets unlimited.
 *
 * Grounding: relevant excerpts from Poshan's own already-sourced data
 * (conditions.ts, poshan-data.ts — see chat-knowledge.ts for the exact
 * citations) are injected into the system prompt per message, plus the
 * `web_search` server tool for anything outside that. The system prompt
 * below is explicit that an ungrounded, unconfident answer must say so
 * rather than invent a source — that instruction is what makes "accurate,
 * source named" an honest claim instead of a hope.
 */

const FREE_DAILY_LIMIT = 15;
const MODEL = "claude-opus-5";

type ChatBody = { chatbot?: "nutrition" | "health"; message?: string; lang?: "en" | "hi" };

/**
 * Separates discarded text from its replacement when the safety gate fires
 * mid-stream. A control character, not a word: it must never collide with
 * anything the model could legitimately produce.
 */
export const SAFETY_MARKER = "\u0000POSHAN_SAFETY\u0000";

const NUTRITION_SYSTEM = `You are "Ask Poshan," a food and nutrition assistant inside the Poshan app — Indian home cooking, calories, macros, micronutrients, cultural dishes, "is X good for Y goal."

Rules, non-negotiable:
- Only state a fact as sourced if it is actually present in the "Relevant data" section below, or came from a web_search result you ran this turn. Say which one plainly (e.g. "per Poshan's meal library" or "per [the actual site/source from your search]").
- If you don't have a grounded source for a specific number (calories, a nutrient value, a health claim) and web search doesn't resolve it either, say plainly that you're not certain rather than stating a figure from memory. A wrong number on a health app is worse than no number.
- Never invent a source name. If you can't name where a fact came from, don't attribute it to anything.
- Keep answers conversational and short unless the user asks for detail.`;

const HEALTH_SYSTEM = `You are "Health Companion," a condition-focused guidance assistant inside the Poshan app.

Rules, non-negotiable:
- You are educational, not diagnostic. You never diagnose, never tell someone to start/stop/change a medication dose, and never interpret a lab result as a verdict — Poshan's own disclaimer applies to you: general nutrition information based on published guidance, not a replacement for a doctor or registered dietitian.
- Anything that reads as a symptom, a new diagnosis question, or a medication question gets redirected to "talk to your doctor about that" — plainly, not as a brush-off.
- Only state a fact as sourced if it is actually present in the "Relevant data" section below (which already carries its own citations — ICMR-NIN, WHO, KDIGO, ICMR-INDIAB, NFHS-5, as marked), or came from a web_search result you ran this turn. Name the actual source.
- If you don't have a grounded source and web search doesn't resolve it, say so plainly rather than guessing.
- Keep answers conversational and short unless the user asks for detail.`;

export async function POST(request: NextRequest) {
  const gate = rateLimit(`chat:${clientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { configured: false, reason: "ANTHROPIC_API_KEY is not set on the server, so the chatbots are off." },
      { status: 503 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: "Sign in to chat." }, { status: 401 });
  }
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in to chat." }, { status: 401 });
  }

  const parsed = await readJsonCapped<ChatBody>(request, 8_192);
  if (!parsed.ok) return parsed.response;

  const chatbot = parsed.data.chatbot === "health" ? "health" : "nutrition";
  const message = parsed.data.message?.trim();
  const lang: "en" | "hi" = parsed.data.lang === "hi" ? "hi" : "en";
  if (!message) {
    return Response.json({ error: "Empty message." }, { status: 400 });
  }
  if (message.length > 4_000) {
    return Response.json({ error: "That message is too long." }, { status: 400 });
  }

  const db = serviceClient();
  if (!db) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const { count: todayCount } = await db
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", startOfTodayIso());

  const { data: subRow } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["trialing", "active"])
    .limit(1)
    .maybeSingle();
  const isPremium = !!subRow;

  if (!isPremium && (todayCount ?? 0) >= FREE_DAILY_LIMIT) {
    return Response.json(
      {
        error: "Free daily limit reached.",
        reason: `You've used today's ${FREE_DAILY_LIMIT} free messages. Resets at midnight UTC, or Poshan Home gets you unlimited.`,
      },
      { status: 429 }
    );
  }

  const { data: historyRows } = await db
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .eq("chatbot", chatbot)
    .order("created_at", { ascending: false })
    .limit(20);
  const history: Anthropic.MessageParam[] = (historyRows ?? [])
    .reverse()
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.content as string }));

  let groundingContext: string;
  if (chatbot === "health") {
    const { data: conditionRows } = await db
      .from("user_conditions")
      .select("condition")
      .eq("user_id", user.id);
    const selectedKeys = (conditionRows ?? []).map((r) => r.condition as string);
    groundingContext = buildHealthContext(message, selectedKeys);
  } else {
    groundingContext = buildNutritionContext(message);
  }

  const systemPrompt = chatbot === "health" ? HEALTH_SYSTEM : NUTRITION_SYSTEM;
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];
  if (groundingContext) {
    system.push({ type: "text", text: `Relevant data for this question:\n${groundingContext}` });
  }

  const client = new Anthropic({ apiKey });
  let messages: Anthropic.MessageParam[] = [...history, { role: "user", content: message }];

  const encoder = new TextEncoder();
  let fullText = "";

  /* An acute-symptom message is answered before the model is ever called.
     Nothing Claude might say about nutrition is the right response to
     "I have chest pain", so the reply cannot be allowed to depend on what
     it happens to generate. Costs one model call saved and removes the
     only path where a genuine emergency waits on a stream. */
  const upfront = gateAiReply("", message, lang);
  if (upfront.gated) {
    await db.from("chat_messages").insert([
      { user_id: user.id, chatbot, role: "user", content: message },
      { user_id: user.id, chatbot, role: "assistant", content: upfront.text },
    ]);
    return new Response(upfront.text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Safety-Gated": upfront.gated,
      },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      /* The gate has to run during the stream, not after it: by the time a
         completed answer could be inspected, the user has already read it.
         So the accumulated text is checked at each sentence boundary, and
         a violation aborts the stream and emits SAFETY_MARKER followed by
         the replacement. The client treats everything before the marker as
         discarded — see chat-widget.tsx.

         Checking per-sentence rather than per-token is deliberate: a
         partial sentence ("you should stop taking") matches patterns that
         its completion ("...advice from randomers online") would not, and
         gating on fragments would fire constantly on innocent answers. */
      /* An object rather than a plain `let`, so that TypeScript doesn't
         narrow the flag to `null` at the checks below — the assignment
         happens inside a callback it cannot see running. */
      const gate = { category: null as string | null };
      let lastChecked = 0;

      const checkNow = (): boolean => {
        /* The whole accumulated answer is re-checked each time rather than
           only the newest sentence: several of these patterns span a
           clause boundary ("your HbA1c" ... "is nothing to worry about"),
           and a sliding window sized to guess how far apart those can fall
           is a window that will eventually be too small. Re-scanning a few
           KB per sentence is not a cost worth optimising against. */
        const verdict = checkAiSafety(fullText);
        if (verdict.safe) return false;
        gate.category = verdict.category;
        const replacement = SAFE_REPLACEMENT[verdict.category][lang];
        controller.enqueue(encoder.encode(SAFETY_MARKER + replacement));
        /* fullText is what gets persisted; the violating text must not be
           what the patient sees on their next visit either. */
        fullText = replacement;
        return true;
      };

      try {
        /* Loop to resume pause_turn on a long web_search-heavy turn — a
           plain single stream() call would silently return a truncated
           answer if Claude paused mid-search. */
        for (let iteration = 0; iteration < 4; iteration++) {
          const anthropicStream = client.messages.stream({
            model: MODEL,
            max_tokens: 4_096,
            system,
            tools: [{ type: "web_search_20260209", name: "web_search" }],
            thinking: { type: "adaptive" },
            messages,
          });

          anthropicStream.on("text", (delta) => {
            if (gate.category) return;
            fullText += delta;
            controller.enqueue(encoder.encode(delta));

            /* Sentence boundary reached — inspect what's accumulated. */
            if (/[.!?\n]\s*$/.test(delta) && fullText.length > lastChecked + 40) {
              lastChecked = fullText.length;
              if (checkNow()) anthropicStream.abort();
            }
          });

          const finalMessage = await anthropicStream.finalMessage();
          if (gate.category) break;

          /* A short answer with no sentence-ending token, or a final
             sentence that never triggered the length threshold, would
             otherwise slip past every mid-stream check. */
          if (checkNow()) break;

          if (finalMessage.stop_reason === "pause_turn") {
            messages = [...messages, { role: "assistant", content: finalMessage.content }];
            continue;
          }
          break;
        }
      } catch (err) {
        /* abort() above rejects finalMessage(), which lands here. That is a
           deliberate stop, not a failure, and appending "something went
           wrong" after the safety message would contradict it. */
        if (!gate.category) {
          controller.enqueue(
            encoder.encode("\n\n[Something went wrong reaching Claude. Try again.]")
          );
          console.error("chat stream error", err);
        }
      } finally {
        controller.close();
        if (fullText) {
          await db.from("chat_messages").insert([
            { user_id: user.id, chatbot, role: "user", content: message },
            { user_id: user.id, chatbot, role: "assistant", content: fullText },
          ]);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Messages-Remaining": isPremium ? "unlimited" : String(Math.max(0, FREE_DAILY_LIMIT - 1 - (todayCount ?? 0))),
    },
  });
}
