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
    <div className="w-full max-w-[420px] rounded-[18px] border border-line bg-paper p-6 shadow-[var(--shadow-float)] sm:p-9">
      <div className="mb-10 flex items-center justify-between gap-4">
        <GhostLogo size="md" />
        <Link
          href="/"
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-graphite transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          {copy.auth.backToHome}
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_SMOOTH }}
      >
        <h1 className="font-heading text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-ink md:text-[40px]">
          {copy.auth.signInTitle}{" "}
          <span className="serif-accent">{copy.auth.signInAccent}</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-graphite">
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
              <Mail className="absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-ash" />
              <input
                id="email"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.auth.emailPlaceholder}
                required
                disabled={loading}
                className="h-14 w-full rounded-full border border-transparent bg-fog pr-5 pl-12 text-ink placeholder:text-ash-text outline-none transition-[background-color,border-color,box-shadow] duration-300 focus:border-ember/40 focus:bg-paper focus:shadow-[var(--ring-ember)] focus-visible:!outline-none disabled:opacity-60"
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="mt-5 h-14 w-full rounded-full bg-ink font-medium tracking-[-0.01em] text-paper transition-[background-color,transform] duration-200 hover:bg-[#24252A] active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
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
              <p className="mb-6 flex items-center gap-2 text-sm text-resolved-text"><span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-resolved" />{message}</p>
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
                  className="tabular h-14 w-full max-w-[52px] rounded-[12px] border border-transparent bg-fog text-center font-heading text-xl font-medium text-ink outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-ember/40 focus:bg-paper focus:shadow-[var(--ring-ember)] focus-visible:!outline-none md:h-16 md:max-w-[56px] md:text-2xl"
                />
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm text-danger">{error}</p>
            )}

            {loading && (
              <p className="mono-label mt-4 flex items-center gap-2 text-ash-text"><span aria-hidden className="ember-dot !h-1.5 !w-1.5" />{copy.auth.verifying}</p>
            )}

            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={loading}
              className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-line underline-offset-[5px] transition-[text-decoration-color] hover:decoration-ink disabled:opacity-40"
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
              className="block min-h-11 text-sm text-graphite transition-colors hover:text-ink"
            >
              {copy.auth.useDifferentEmail}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
