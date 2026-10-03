"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
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
    return <div className="ghost-skeleton h-10 w-[88px] !rounded-full" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-[14px] font-medium tracking-[-0.01em] text-paper transition-[background-color,transform] duration-200 hover:bg-[#24252A] active:scale-[0.98] max-sm:min-h-11"
      >
        {copy.nav.signIn}
      </button>
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
      <div className="hidden items-center gap-1 sm:flex">
        <Link
          href="/dashboard/overview"
          className="hidden max-w-[180px] truncate px-2 text-[13px] text-ash-text transition-colors hover:text-ink xl:block"
          title={user.email}
        >
          {user.email}
        </Link>
        <Link
          href="/dashboard/overview"
          className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-[14px] font-medium text-paper transition-colors hover:bg-[#24252A]"
        >
          {copy.nav.dashboard}
        </Link>
        <Link
          href="/dashboard/settings"
          className="inline-flex min-h-10 items-center rounded-full px-3 text-[14px] text-graphite transition-colors hover:bg-fog/70 hover:text-ink"
        >
          {copy.nav.profile}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex min-h-10 items-center rounded-full px-3 text-[14px] text-graphite transition-colors hover:bg-fog/70 hover:text-ink"
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
          className="grid h-11 w-11 place-items-center rounded-full bg-ink text-sm font-medium uppercase text-paper transition-colors hover:bg-[#24252A]"
        >
          {user.email.charAt(0) || <UserRound className="h-4 w-4" />}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-[14px] border border-line bg-paper/95 shadow-[var(--shadow-float)] backdrop-blur-xl"
          >
            <p className="mono-label truncate border-b border-line px-4 py-3 text-ash-text">
              {user.email}
            </p>
            <Link
              href="/dashboard/overview"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 px-4 py-3 text-sm text-graphite transition-colors hover:bg-mist hover:text-ink"
            >
              <LayoutDashboard className="h-4 w-4" />
              {copy.nav.dashboard}
            </Link>
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 px-4 py-3 text-sm text-graphite transition-colors hover:bg-mist hover:text-ink"
            >
              <UserRound className="h-4 w-4" />
              {copy.nav.profile}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex min-h-11 w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-graphite transition-colors hover:bg-mist hover:text-ink"
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
