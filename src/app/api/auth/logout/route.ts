import { NextResponse } from "next/server";
import { applyClearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    return applyClearSessionCookie(response);
  } catch (error) {
    console.error("[logout]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
