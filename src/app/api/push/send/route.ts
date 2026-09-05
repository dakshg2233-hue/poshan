import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { serviceClient } from "@/lib/supabase";

/**
 * Sends one push notification to every subscribed device.
 *
 * Not called by the app itself — this is the endpoint a scheduler is
 * meant to hit (Vercel Cron, GitHub Actions, any server cron job), which
 * is why it checks a bearer secret instead of a user session: nothing on
 * this codebase's deployment currently calls it on a schedule. Wire your
 * own cron to POST here with `Authorization: Bearer $PUSH_CRON_SECRET`
 * and a JSON body like {"title": "Log breakfast?", "body": "..."}.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "PUSH_CRON_SECRET is not set on the server." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: "Web push isn't configured (VAPID keys missing)." }, { status: 503 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "Poshan";
  const message = typeof body.body === "string" ? body.body : "Don't forget to log today's meals.";
  const url = typeof body.url === "string" ? body.url : "/dashboard";

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth_key");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let sent = 0;
  let removed = 0;
  const payload = JSON.stringify({ title, body: message, url });

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        sent += 1;
      } catch (err: unknown) {
        /* 404/410 means the browser dropped the subscription (uninstalled,
           cleared data) — clean it up rather than retrying it forever. */
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", sub.id);
          removed += 1;
        }
      }
    })
  );

  return NextResponse.json({ sent, removed, total: subs?.length ?? 0 });
}
