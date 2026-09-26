/**
 * Creates the three Razorpay Plans the checkout needs, priced from the
 * app's own constants.
 *
 *   npm run razorpay:plans              # shows what it would do, changes nothing
 *   npm run razorpay:plans -- --create  # creates whatever is missing
 *
 * Prices come from PREMIUM and COLLEGE_PLAN in src/lib/poshan-data.ts,
 * the same constants /api/razorpay/subscription writes into
 * checkout_orders as the expected amount. A plan typed by hand in the
 * dashboard can disagree with that ledger by one digit, and the first
 * sign of it would be a customer charged the wrong price.
 *
 * Existing plans are reused, not duplicated. A plan with the same name,
 * amount and period is treated as already made. Running this twice is
 * harmless, and Razorpay plans cannot be deleted once created.
 *
 * Keys are read from the environment (.env.local via --env-file). Nothing
 * is written to disk. The plan ids are printed for you to paste into
 * .env.local and Netlify.
 */
import { PREMIUM, COLLEGE_PLAN } from "../src/lib/poshan-data.ts";

const CREATE = process.argv.includes("--create");
const { RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET } = process.env;

if (!KEY_ID || !KEY_SECRET) {
  console.error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set, in .env.local or the environment."
  );
  process.exit(1);
}

const mode = KEY_ID.startsWith("rzp_live_") ? "LIVE" : KEY_ID.startsWith("rzp_test_") ? "TEST" : "UNKNOWN";
console.log(`Razorpay key: ${mode} mode\n`);
if (mode === "TEST") {
  console.log("Test-mode plans only work with test-mode keys. Run again with live keys for launch.\n");
}

const WANTED = [
  { env: "RAZORPAY_PLAN_ID_MONTHLY", name: "Poshan Home, monthly", period: "monthly", rupees: PREMIUM.monthly },
  { env: "RAZORPAY_PLAN_ID_YEARLY", name: "Poshan Home, yearly", period: "yearly", rupees: PREMIUM.yearly },
  { env: "RAZORPAY_PLAN_ID_COLLEGE", name: "Poshan Plus, yearly", period: "yearly", rupees: COLLEGE_PLAN.yearly },
];

const auth = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

async function razorpay(method, path, body) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = json?.error?.description ?? res.statusText;
    throw new Error(`${method} ${path} -> ${res.status}: ${reason}`);
  }
  return json;
}

const existing = [];
for (let skip = 0; ; skip += 100) {
  const page = await razorpay("GET", `/plans?count=100&skip=${skip}`);
  existing.push(...page.items);
  if (page.items.length < 100) break;
}

const lines = [];
for (const want of WANTED) {
  const paise = want.rupees * 100;
  const match = existing.find(
    (p) =>
      p.item?.name === want.name &&
      p.item?.amount === paise &&
      p.item?.currency === "INR" &&
      p.period === want.period &&
      p.interval === 1
  );

  if (match) {
    console.log(`exists  ${want.name.padEnd(22)} ₹${want.rupees}  ${match.id}`);
    lines.push(`${want.env}=${match.id}`);
    continue;
  }

  if (!CREATE) {
    console.log(`missing ${want.name.padEnd(22)} ₹${want.rupees}  (would create)`);
    continue;
  }

  const plan = await razorpay("POST", "/plans", {
    period: want.period,
    interval: 1,
    item: { name: want.name, amount: paise, currency: "INR" },
  });
  console.log(`created ${want.name.padEnd(22)} ₹${want.rupees}  ${plan.id}`);
  lines.push(`${want.env}=${plan.id}`);
}

if (lines.length === WANTED.length) {
  console.log("\nPaste into .env.local, and into Netlify with All scopes:\n");
  console.log(lines.join("\n"));
} else if (!CREATE) {
  console.log("\nNothing was created. Run again with --create to make the missing plans.");
}
