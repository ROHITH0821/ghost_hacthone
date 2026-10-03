import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fonts for the PDF are embedded as base64 rather than linked.
 *
 * The serverless Chromium (@sparticuz/chromium) ships almost no system fonts, so
 * a `font-family` stack alone renders in whatever fallback happens to exist —
 * a report that looks right locally looks different in production. Inlining the
 * faces makes the two identical, with no network fetch inside the render.
 *
 * Files live under `public/` for the same reason the report logo does: that path
 * is already proven to resolve under Next's serverless file tracing.
 *
 * Latin subsets, only the weights the report uses (~61KB total).
 */

const FONT_DIR = join(process.cwd(), "public", "fonts");

type FaceSpec = {
  file: string;
  family: string;
  weight: number;
};

const FACES: FaceSpec[] = [
  { file: "inter-400.woff2", family: "Inter", weight: 400 },
  { file: "inter-600.woff2", family: "Inter", weight: 600 },
  { file: "space-grotesk-700.woff2", family: "Space Grotesk", weight: 700 },
];

/** Face the renderer asserts is live before writing the PDF. */
export const FONT_PROBE = '700 24px "Space Grotesk"';

let cached: string | null = null;

/**
 * `@font-face` CSS with every face inlined as a data URI. Cached per process, so
 * a warm serverless instance reads the files once rather than per report.
 *
 * Returns "" if the files can't be read — a report in a fallback font is a
 * better outcome than a failed download, and the caller logs the degradation.
 */
export async function fontFaceCss(): Promise<string> {
  if (cached !== null) return cached;

  try {
    const blocks = await Promise.all(
      FACES.map(async (face) => {
        const buf = await readFile(join(FONT_DIR, face.file));
        return (
          `@font-face{font-family:"${face.family}";font-style:normal;` +
          `font-weight:${face.weight};font-display:block;` +
          `src:url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2");}`
        );
      }),
    );
    cached = blocks.join("");
  } catch (error) {
    console.error("[reportPdf] font embedding failed, using fallback:", error);
    cached = "";
  }

  return cached;
}
