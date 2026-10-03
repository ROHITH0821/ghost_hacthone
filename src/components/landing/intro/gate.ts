"use client";

import { useEffect, useState } from "react";

import { INTRO_DONE_EVENT } from "./script";

export { INTRO_DONE_EVENT };

function introPending() {
  if (typeof document === "undefined") return false;
  const state = document.documentElement.dataset.intro;
  return state === "play";
}

/** True once the intro has handed off to the hero (or immediately if no intro). */
export function useIntroReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!introPending()) {
      setReady(true);
      return;
    }
    const done = () => setReady(true);
    window.addEventListener(INTRO_DONE_EVENT, done, { once: true });
    // Failsafe: never hold content hostage.
    const timer = window.setTimeout(done, 3200);
    return () => {
      window.removeEventListener(INTRO_DONE_EVENT, done);
      window.clearTimeout(timer);
    };
  }, []);
  return ready;
}
