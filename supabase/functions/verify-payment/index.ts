import { createSupabaseClient } from "@supabase/server";

const RAZORPAY_SECRET = Deno.env.get("RAZORPAY_SECRET_KEY");

const supabase = createSupabaseClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      user_id,
      amount_paise,
      plan,
    } = body;

    // Verify signature
    const crypto = await import("crypto");
    const generated_signature = crypto
      .createHmac("sha256", RAZORPAY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const signature_valid = generated_signature === razorpay_signature;

    // Log payment event
    await supabase.from("payment_events").insert({
      razorpay_order_id,
      razorpay_payment_id,
      signature_valid,
      amount_paise,
      source: "webhook",
      raw: body,
    });

    // If signature is valid, create subscription
    if (signature_valid) {
      const current_period_end = new Date();
      current_period_end.setMonth(
        current_period_end.getMonth() + (plan === "yearly" ? 12 : 1)
      );

      await supabase.from("subscriptions").insert({
        user_id,
        plan,
        status: "active",
        razorpay_order_id,
        razorpay_payment_id,
        amount_paise,
        current_period_end: current_period_end.toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription created",
        }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid signature",
        }),
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});
