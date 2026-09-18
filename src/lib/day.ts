/**
 * Calendar days, in the timezone Poshan's users actually live in.
 *
 * Every "what day is it" in this codebase was
 * `new Date().toISOString().slice(0, 10)`, which is the day in **UTC**.
 * India is UTC+5:30, so between midnight and 05:30 IST that expression
 * returns yesterday. For an app whose whole model is one row per day —
 * meal logs, daily context, symptom journals, weight, streaks — that is
 * five and a half hours every night during which the app quietly writes to
 * the wrong day and reads back the wrong plan.
 *
 * It fails exactly where it hurts most. Dinner in India is late; a meal
 * logged at half past midnight went into yesterday's total. The streak
 * that day looked empty, so the streak broke. Anyone awake before 05:30
 * opened Today and was shown yesterday.
 *
 * Asia/Kolkata is hardcoded rather than read from the request, and that is
 * a decision, not an oversight: Poshan is an India-first product, the day
 * boundary has to be the same one the meal plans assume, and a server has
 * no reliable way to know a visitor's timezone anyway. An NRI user gets
 * Indian days — wrong for them at the margins, but consistently wrong in a
 * way that is easy to explain, rather than shifting under them depending
 * on which server answered.
 *
 * India has no daylight saving, so the offset is a constant and
 * Intl handles it without any of the usual DST caveats.
 */

const IST = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar day of an instant, in IST, as YYYY-MM-DD. */
export function dayOf(date: Date): string {
  /* en-CA formats as YYYY-MM-DD, which is the shape every log_date,
     context_date and occurred_on column in this schema already uses. */
  return IST.format(date);
}

/** Today in IST, as YYYY-MM-DD. */
export function today(): string {
  return dayOf(new Date());
}

/**
 * The IST calendar day `n` days before today.
 *
 * Subtracting 24h of milliseconds and re-reading the IST day is safe here
 * because India has no daylight saving: every Indian day is exactly 24
 * hours long, so the arithmetic cannot drift.
 */
export function daysAgo(n: number): string {
  return dayOf(new Date(Date.now() - n * 86_400_000));
}

/**
 * The instant IST midnight began today, as an ISO timestamp.
 *
 * For comparing against `timestamptz` columns — a daily quota, say — where
 * the question is "since the user's day started", not "since UTC midnight".
 */
export function startOfTodayIso(): string {
  /* IST is UTC+5:30 year round, so today's IST midnight is that day at
     00:00 minus the offset. */
  return new Date(`${today()}T00:00:00+05:30`).toISOString();
}
