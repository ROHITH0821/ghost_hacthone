"use client";

import { useEffect, useState } from "react";

const FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Renders a timestamp without hydration mismatches: the server and the first
 * client render both use a fixed locale + UTC (deterministic output), then the
 * mounted client re-renders in the visitor's own locale and timezone.
 */
export function LocalTime({ date }: { date: Date | string }) {
  const ts = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const [text, setText] = useState(() =>
    new Date(ts).toLocaleString("en-US", { ...FORMAT, timeZone: "UTC" })
  );

  useEffect(() => {
    setText(new Date(ts).toLocaleString(undefined, FORMAT));
  }, [ts]);

  return <time dateTime={new Date(ts).toISOString()}>{text}</time>;
}
