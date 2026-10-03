"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";
import { GhostLogo } from "@/components/ui/GhostLogo";
import { TextLink } from "@/components/ui/BRAVE";
import { safeAppRedirect } from "@/lib/website-input";
import { copy } from "@/lib/copy";
import { EASE_SMOOTH } from "@/lib/motion";

export default function EarlyAccessPage() {
  const { user, loading, refresh, logout } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const didAutoSync = useRef(false);

  const syncAndContinue = useCallback(async () => {
    setChecking(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/sync-access", { method: "POST" });
      const data = await res.json();
      if (data.success && data.accessStatus === "approved") {
        await refresh();
        let destination = "/dashboard/overview";
        try { destination = safeAppRedirect(sessionStorage.getItem("ghost-pending-redirect")); sessionStorage.removeItem("ghost-pending-redirect"); } catch { /* Optional browser storage. */ }
        router.push(destination);
        return;
      }
      setMessage(copy.earlyAccess.body);
    } catch {
      setMessage(copy.auth.errors.network);
    } finally {
      setChecking(false);
    }
  }, [refresh, router]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/early-access");
      return;
    }
    // Re-sync from DB once on load so freshly approved users continue
    // without needing a manual "Check again" click.
    if (didAutoSync.current) return;
    didAutoSync.current = true;
    void syncAndContinue();
  }, [loading, user, router, syncAndContinue]);

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  return (
    <main id="main-content" tabIndex={-1} className="relative flex min-h-screen flex-col items-center justify-center section-pad">
      <div className="mb-10">
        <GhostLogo size="md" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_SMOOTH }}
        className="w-full max-w-md text-center"
      >
        <h1 className="font-heading text-2xl font-semibold text-ghost-white md:text-3xl">
          {copy.earlyAccess.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-light md:text-base">
          {message || copy.earlyAccess.body}
        </p>
        {user?.email && (
          <p className="mt-3 text-sm text-muted">{user.email}</p>
        )}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => void syncAndContinue()}
            disabled={checking || loading}
            className="inline-flex items-center justify-center rounded-xl border border-violet/50 bg-violet/20 px-5 py-2.5 text-sm font-medium text-violet-glow transition-colors hover:border-violet/70 hover:bg-violet/30 disabled:opacity-50"
          >
            {checking ? copy.earlyAccess.checking : copy.earlyAccess.checkAgain}
          </button>
          <TextLink onClick={() => void handleSignOut()} className="!text-sm">
            {copy.earlyAccess.signOut}
          </TextLink>
        </div>
      </motion.div>
    </main>
  );
}
