import { NextRequest, NextResponse } from "next/server";
import { verifyLoginOtp } from "@/lib/auth";
import { applySessionCookie } from "@/lib/auth/session";
import { copy } from "@/lib/copy";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: copy.authApi.invalidEmailOrCode },
        { status: 400 }
      );
    }

    const result = await verifyLoginOtp(email, code);
    const { sessionToken, ...payload } = result;
    const response = NextResponse.json(payload, {
      status: result.success ? 200 : 400,
    });
    if (result.success && sessionToken) {
      applySessionCookie(response, sessionToken);
    }
    return response;
  } catch (error) {
    console.error("[verify-otp]", error);
    return NextResponse.json(
      { success: false, message: copy.authApi.somethingWrong },
      { status: 500 }
    );
  }
}
