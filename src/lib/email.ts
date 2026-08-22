import { Resend } from "resend";

/**
 * Built on first use, not at module scope. `new Resend(undefined)` throws
 * "Missing API key" during module evaluation, which takes down every route
 * that imports this file before its handler can run: the throw happens at
 * import time, so a try/catch inside the handler never sees it. Constructing
 * lazily keeps an unset key a handled condition, the way Supabase, Razorpay
 * and Omniroute already degrade.
 */
let client: Resend | null = null;

/** True when RESEND_API_KEY is set. Callers should check before sending. */
export function emailReady() {
  return Boolean(process.env.RESEND_API_KEY);
}

function resendClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendOtpEmail(email: string, otp: string) {
  return resendClient().emails.send({
    from: "Poshan <auth@poshan.health>",
    to: email,
    subject: "Your Poshan Login Code",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="margin: 0 0 20px 0; color: #0f0f0f; font-size: 24px;">Know your body. Eat like home.</h1>

          <p style="color: #666; font-size: 16px; margin: 20px 0;">Hi there,</p>

          <p style="color: #666; font-size: 16px; margin: 20px 0;">Use this code to sign in to your Poshan account:</p>

          <div style="background: #f0b055; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: white;">${otp}</p>
          </div>

          <p style="color: #999; font-size: 14px; margin: 20px 0;">This code expires in 1 hour.</p>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">If you didn't request this code, you can safely ignore this email.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; margin: 0;">Poshan • Know your body. Eat like home.</p>
          <p style="color: #999; font-size: 12px; margin: 5px 0;">Made for India 🇮🇳</p>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const userName = name || "Friend";
  return resendClient().emails.send({
    from: "Poshan <hello@poshan.health>",
    to: email,
    subject: "Welcome to Poshan! 🌾",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="margin: 0 0 20px 0; color: #0f0f0f; font-size: 28px;">Welcome to Poshan, ${userName}! 🌾</h1>

          <p style="color: #666; font-size: 16px; margin: 20px 0;">You're now part of a community of Indians taking control of their wellness through authentic, personalized nutrition.</p>

          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #22c55e;">
            <h2 style="margin: 0 0 15px 0; color: #0f0f0f; font-size: 18px;">Getting Started</h2>
            <ul style="color: #666; margin: 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Complete your health profile (height, weight, health conditions)</li>
              <li style="margin: 8px 0;">Choose your preferred cuisine and diet type</li>
              <li style="margin: 8px 0;">Get personalized meal recommendations based on YOUR body</li>
              <li style="margin: 8px 0;">Track your progress with real-time metrics</li>
            </ul>
          </div>

          <p style="color: #666; font-size: 16px; margin: 20px 0;">Our meal plans are 100% authentic Indian recipes, calibrated for Indian bodies using Asian-Indian BMI cutoffs, because you're not a European body, and your nutrition shouldn't be either.</p>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">Questions? We're here to help. Reply to this email anytime.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; margin: 0;">Poshan • Know your body. Eat like home.</p>
        </div>
      </div>
    `,
  });
}

export async function sendConfirmationEmail(email: string) {
  return resendClient().emails.send({
    from: "Poshan <auth@poshan.health>",
    to: email,
    subject: "Account Confirmed ✅",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="margin: 0 0 20px 0; color: #0f0f0f; font-size: 24px;">Account Confirmed ✅</h1>

          <p style="color: #666; font-size: 16px; margin: 20px 0;">Your Poshan account is all set. You can now sign in and start your personalized wellness journey.</p>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">Start with Poshan Home (₹299/month) to get personalized meal plans, biomarker tracking, and direct support from our wellness team.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; margin: 0;">Made for India 🇮🇳</p>
        </div>
      </div>
    `,
  });
}
