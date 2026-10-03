/** Reveal easing for the Ghost White + Ember motion system. */
export const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Interactive elements (buttons, tilt, magnetic hover). */
export const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

export const DURATION = { micro: 0.18, ui: 0.4, reveal: 0.8 } as const;

export const VIEWPORT_DEFAULT = {
  once: true,
  margin: "-80px 0px -80px 0px",
  amount: 0.2,
} as const;

export const VIEWPORT_TIGHT = {
  once: true,
  margin: "-40px 0px",
  amount: 0.4,
} as const;

export const STAGGER = 0.06;
