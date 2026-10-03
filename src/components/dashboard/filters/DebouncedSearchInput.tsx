"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Search box that types locally and commits to the URL only once the user
 * pauses. Committing on every keystroke re-runs the server component (and its
 * queries) for every character, which is what made filtering feel slow.
 */
export function DebouncedSearchInput({
  value,
  onCommit,
  delay = 350,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (next: string) => void;
  delay?: number;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  // Keep the latest callback without restarting the timer on every render.
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Adopt external changes (preset applied, filters cleared, back/forward).
  const lastCommitted = useRef(value);
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (draft === lastCommitted.current) return;
    const timer = setTimeout(() => {
      lastCommitted.current = draft;
      onCommitRef.current(draft);
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, delay]);

  return (
    <input
      type="search"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
