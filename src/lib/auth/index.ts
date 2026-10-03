import { copy } from "@/lib/copy";
import { generateOtp, isValidEmail, normalizeEmail } from "./otp";
import { upsertUserByEmail } from "@/lib/db/users";
import {
  isRateLimited,
  storePendingOtp,
  verifyPendingOtp,
} from "./otp-cookie";
import { sendOtpEmail } from "./resend";
import {
  createSessionToken,
  clearSessionCookie,
  getSession,
  type SessionPayload,
} from "./session";

export type { SessionPayload };
export { getSession, clearSessionCookie };

export async function sendLoginOtp(
  email: string
): Promise<{ success: boolean; message: string }> {
  const normalized = normalizeEmail(email);

  if (!isValidEmail(normalized)) {
    return { success: false, message: copy.authApi.invalidEmail };
  }

  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    console.error("[auth] AUTH_SECRET missing or too short");
    return {
      success: false,
      message: copy.authApi.somethingWrong,
    };
  }

  if (await isRateLimited(normalized)) {
    return {
      success: false,
      message: copy.authApi.tooManyRequests,
    };
  }

  const code = generateOtp();
  await storePendingOtp(normalized, code);

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[Ghost Dev] OTP for ${normalized}: ${code}\n`);
      return {
        success: true,
        message: copy.authApi.devModeTerminal(normalized),
      };
    }
    return {
      success: false,
      message: copy.authApi.emailNotConfigured,
    };
  }

  const result = await sendOtpEmail(normalized, code);

  if (!result.success) {
    return {
      success: false,
      message: result.error ?? copy.authApi.emailSendFailed,
    };
  }

  return {
    success: true,
    message: copy.authApi.codeSent(normalized),
  };
}

export async function verifyLoginOtp(
  email: string,
  code: string
): Promise<{
  success: boolean;
  message: string;
  user?: SessionPayload;
  sessionToken?: string;
}> {
  const normalized = normalizeEmail(email);

  if (!isValidEmail(normalized) || !/^\d{6}$/.test(code)) {
    return { success: false, message: copy.authApi.invalidEmailOrCode };
  }

  const verification = await verifyPendingOtp(normalized, code);

  if (!verification.valid) {
    if (verification.reason === "expired") {
      return { success: false, message: copy.authApi.codeExpired };
    }
    if (verification.reason === "incorrect") {
      return { success: false, message: copy.authApi.incorrectCode };
    }
    return { success: false, message: copy.authApi.noActiveCode };
  }

  let userId: string;
  let accessStatus: "pending" | "approved" = "pending";
  try {
    const user = await upsertUserByEmail(normalized);
    userId = user.id;
    accessStatus = user.accessStatus === "approved" ? "approved" : "pending";
  } catch (error) {
    console.error("[auth] failed to upsert user:", error);
    return {
      success: false,
      message: copy.authApi.somethingWrong,
    };
  }

  const sessionToken = await createSessionToken({
    userId,
    email: normalized,
    accessStatus,
  });

  return {
    success: true,
    message: copy.authApi.signedIn,
    user: { userId, email: normalized, accessStatus },
    sessionToken,
  };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
}
