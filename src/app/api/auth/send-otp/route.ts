import { sendOtpEmail, sendWelcomeEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, isNewUser } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send OTP email
    const result = await sendOtpEmail(email, otp);

    if (result.error) {
      console.error("Email send error:", result.error);
      return NextResponse.json(
        { error: "Failed to send email. Try again later." },
        { status: 500 }
      );
    }

    // If new user, send welcome email too (non-blocking)
    if (isNewUser) {
      sendWelcomeEmail(email).catch((err) =>
        console.error("Welcome email error:", err)
      );
    }

    return NextResponse.json(
      { message: "OTP sent successfully", id: result.data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
