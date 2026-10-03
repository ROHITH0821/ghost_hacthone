"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { TextLink } from "@/components/ui/BRAVE";
import { copy } from "@/lib/copy";

export function UserMenu() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile dropdown on outside tap or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (loading) {
    return <div className="h-5 w-20 animate-pulse rounded bg-border" />;
  }

  if (!user) {
    return (
      <TextLink onClick={() => router.push("/login")} className="!text-sm md:!text-base">
        {copy.nav.signIn}
      </TextLink>
    );
  }

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <>
      {/* Desktop / tablet: inline menu */}
      <div className="hidden items-center gap-4 sm:flex">
        <Link
          href="/dashboard/overview"
          className="max-w-[220px] truncate text-sm text-muted-light transition-colors hover:text-ghost-white"
          title={user.email}
        >
          {user.email}
        </Link>
        <Link
          href="/dashboard/overview"
          className="rounded-xl border border-border bg-surface/30 px-3 py-1.5 text-sm text-ghost-white/70 transition-colors hover:text-ghost-white"
        >
          {copy.nav.dashboard}
        </Link>
        <Link
          href="/dashboard/settings"
          className="text-sm text-ghost-white/60 transition-colors hover:text-ghost-white"
        >
          {copy.nav.profile}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-ghost-white/60 transition-colors hover:text-ghost-white"
        >
          {copy.nav.signOut}
        </button>
      </div>

      {/* Mobile: avatar button with dropdown */}
      <div ref={menuRef} className="relative sm:hidden">
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/40 text-sm font-semibold uppercase text-ghost-white/90 transition-colors hover:border-violet/50"
        >
          {user.email.charAt(0) || <UserRound className="h-4 w-4" />}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-border bg-midnight/95 shadow-2xl backdrop-blur-xl"
          >
            <p className="truncate border-b border-border px-4 py-3 text-xs text-muted">
              {user.email}
            </p>
            <Link
              href="/dashboard/overview"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-ghost-white/80 transition-colors hover:bg-surface/40 hover:text-ghost-white"
            >
              <LayoutDashboard className="h-4 w-4" />
              {copy.nav.dashboard}
            </Link>
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-ghost-white/80 transition-colors hover:bg-surface/40 hover:text-ghost-white"
            >
              <UserRound className="h-4 w-4" />
              {copy.nav.profile}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-ghost-white/80 transition-colors hover:bg-surface/40 hover:text-ghost-white"
            >
              <LogOut className="h-4 w-4" />
              {copy.nav.signOut}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
