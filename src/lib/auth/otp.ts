import { createHash, randomInt } from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS_PER_HOUR = 5;

export function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

export function isOtpExpired(expiresAt: Date): boolean {
  return expiresAt < new Date();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export { OTP_EXPIRY_MINUTES, MAX_ATTEMPTS_PER_HOUR };
