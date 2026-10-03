/** Paper canvas with a 3% film grain, so the white reads as stock, not screen. */
export function SiteBackground() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-paper" />
      <div aria-hidden className="grain" />
    </>
  );
}
