import { NextRequest, NextResponse } from "next/server";
import { sendLoginOtp } from "@/lib/auth";
import { copy } from "@/lib/copy";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: copy.authApi.emailRequired }, { status: 400 });
    }

    const result = await sendLoginOtp(email);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("[send-otp]", error);
    return NextResponse.json(
      { success: false, message: copy.authApi.somethingWrong },
      { status: 500 }
    );
  }
}
