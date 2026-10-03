"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EASE_SMOOTH } from "@/lib/motion";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { safeAppRedirect } from "@/lib/website-input";
import { copy } from "@/lib/copy";

type Step = "email" | "otp";

export function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyingRef = useRef(false);
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const redirect = safeAppRedirect(searchParams.get("redirect"));
  const pendingUrl = searchParams.get("url") ?? "";

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [step]);

  const requestOtp = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage(data.message);
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(data.message ?? copy.auth.errors.sendFailed);
      }
    } catch {
      setError(copy.auth.errors.network);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtp();
  };

  const handleVerifyOtp = async (code: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (data.success) {
        await refresh();

        const accessStatus = data.user?.accessStatus ?? "pending";
        const nextPath =
          accessStatus !== "approved"
            ? "/early-access"
            : pendingUrl
              ? `/dashboard/overview?newAudit=1&url=${encodeURIComponent(pendingUrl)}`
              : redirect;

        if (accessStatus !== "approved") {
          try {
            sessionStorage.setItem(
              "ghost-pending-redirect",
              pendingUrl
                ? `/dashboard/overview?newAudit=1&url=${encodeURIComponent(pendingUrl)}`
                : redirect,
            );
          } catch {
            /* Optional navigation continuity. */
          }
        }

        // Full navigation so the new session cookie is sent to middleware.
        window.location.assign(nextPath);
        return;
      }

      setError(data.message ?? copy.auth.errors.invalidCode);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      verifyingRef.current = false;
    } catch {
      setError(copy.auth.errors.network);
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d) && next.join("").length === 6) {
      handleVerifyOtp(next.join(""));
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtp(digits);
      handleVerifyOtp(pasted);
    }
  };

  return (
    <div className="w-full max-w-md surface-panel p-6 sm:p-8">
      <div className="mb-10 flex items-center justify-between gap-4">
        <GhostLogo size="md" />
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted transition-colors hover:text-ghost-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.auth.backToHome}
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_SMOOTH }}
      >
        <h1 className="font-heading text-3xl font-bold text-ghost-white md:text-4xl">
          {copy.auth.signInTitle}{" "}
          <span className="text-gradient">{copy.auth.signInAccent}</span>
        </h1>
        <p className="mt-3 text-sm text-muted-light md:text-base">
          {pendingUrl && step === "email"
            ? copy.auth.loginToAnalyze(pendingUrl)
            : step === "email"
              ? copy.auth.emailStepDescription
              : copy.auth.otpStepDescription(email)}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.form
            key="email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4, ease: EASE_SMOOTH }}
            onSubmit={handleSendOtp}
            className="mt-10"
          >
            <label htmlFor="email" className="label-caps mb-3 block">
              {copy.auth.emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="email"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.auth.emailPlaceholder}
                required
                disabled={loading}
                className="w-full rounded-2xl border border-border bg-surface py-4 pr-4 pl-11 text-ghost-white placeholder:text-muted outline-none transition-colors focus:border-violet/50"
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="mt-6 w-full rounded-2xl bg-violet py-4 font-heading font-semibold text-midnight transition-all hover:bg-violet-dim disabled:opacity-40"
            >
              {loading ? copy.auth.sending : copy.auth.sendCode}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: EASE_SMOOTH }}
            className="mt-10"
          >
            {message && (
              <p className="mb-6 text-sm text-neon-green">{message}</p>
            )}

            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  aria-label={`Code digit ${i + 1}`}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={loading}
                  className="h-14 w-full max-w-[52px] rounded-xl border border-border bg-surface text-center text-xl font-bold text-ghost-white outline-none transition-colors focus:border-violet/50 md:h-16 md:max-w-[60px] md:text-2xl"
                />
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm text-danger">{error}</p>
            )}

            {loading && (
              <p className="mt-4 text-sm text-muted">{copy.auth.verifying}</p>
            )}

            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={loading}
              className="mt-4 text-sm text-violet transition-colors hover:text-violet-glow disabled:opacity-40"
            >
              {copy.auth.resendCode}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
              className="mt-4 block text-sm text-muted transition-colors hover:text-ghost-white"
            >
              {copy.auth.useDifferentEmail}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
