import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // 40 is used by the decorative background watermark (rendered at 7% opacity,
    // so compression artefacts are invisible); 75 is the Next.js default.
    qualities: [40, 75],
  },
  // Keep soft-navigated dashboard RSC payloads warm so tab switches reuse the
  // client router cache instead of blocking on a full DB round-trip every time.
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  // This app is nested inside the engine's repo (which has its own lockfile), so
  // Next would otherwise infer the wrong workspace root. Pin it to this folder.
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  // Keep heavy/native server-only packages out of the bundle — they're required
  // at runtime (Node) rather than bundled. Playwright ships native binaries;
  // cheerio and the Anthropic SDK are server-only too.
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "@sparticuz/chromium",
    "cheerio",
    "@anthropic-ai/sdk",
  ],
  // PDF generation unpacks chromium.br + al2023.tar.br (libnss3.so). Tracing
  // the package by import can miss the brotli archives on Vercel.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
