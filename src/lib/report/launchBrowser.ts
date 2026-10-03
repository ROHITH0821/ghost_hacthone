import { existsSync } from "node:fs";
import { unlink, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Browser } from "playwright-core";

const CHROMIUM_BIN = () => join(tmpdir(), "chromium");
const AL2023_DIR = () => join(tmpdir(), "al2023");
const NSS_SO = () => join(tmpdir(), "al2023", "lib", "libnss3.so");
const AL2023_LIB = () => join(tmpdir(), "al2023", "lib");

function isServerless(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL_ENV,
  );
}

/**
 * @sparticuz/chromium extracts libnss3/libnspr4 only when it believes it is on
 * Amazon Linux 2023. Set the Netlify/Lambda hint before the package is imported.
 * Vercel Fluid Compute often omits AWS_LAMBDA_* vars.
 */
function ensureLambdaRuntimeHint(): void {
  if (process.env.AWS_LAMBDA_JS_RUNTIME || process.env.AWS_EXECUTION_ENV) {
    return;
  }
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "22", 10);
  process.env.AWS_LAMBDA_JS_RUNTIME = major >= 22 ? "nodejs22.x" : "nodejs20.x";
}

function ensureChromiumLibraryPath(): void {
  const libDir = AL2023_LIB();
  const existing = process.env.LD_LIBRARY_PATH;
  if (!existing) {
    process.env.LD_LIBRARY_PATH = libDir;
    return;
  }
  const parts = existing.split(":");
  if (!parts.includes(libDir)) {
    process.env.LD_LIBRARY_PATH = [libDir, ...parts].join(":");
  }
}

function spawnEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH ?? AL2023_LIB();
  return env;
}

function resolveSparticuzRoot(): string {
  try {
    const require = createRequire(join(process.cwd(), "package.json"));
    return dirname(require.resolve("@sparticuz/chromium/package.json"));
  } catch {
    return join(process.cwd(), "node_modules", "@sparticuz", "chromium");
  }
}

/**
 * Warm Fluid Compute instances keep /tmp. executablePath() returns early if
 * /tmp/chromium exists, and inflate() also no-ops if /tmp/al2023 exists — even
 * when libnss3.so was never unpacked. Clear both so the next extract is full.
 */
async function clearIncompleteChromiumPack(): Promise<void> {
  const nssOk = existsSync(NSS_SO());
  const binaryOk = existsSync(CHROMIUM_BIN());
  if (nssOk && binaryOk) return;

  if (binaryOk) {
    await unlink(CHROMIUM_BIN()).catch(() => undefined);
  }
  if (!nssOk && existsSync(AL2023_DIR())) {
    await rm(AL2023_DIR(), { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Unpack AL2023 shared libs even if Chromium's executablePath() skipped them. */
async function inflateAl2023Libs(): Promise<void> {
  if (existsSync(NSS_SO())) return;

  const root = resolveSparticuzRoot();
  const archive = join(root, "bin", "al2023.tar.br");
  if (!existsSync(archive)) {
    throw new Error(
      `Chromium AL2023 library archive missing at ${archive}. Redeploy so @sparticuz/chromium/bin is traced into the function.`,
    );
  }

  const require = createRequire(join(root, "package.json"));
  const { inflate } = require("./build/cjs/lambdafs.cjs") as {
    inflate: (filePath: string) => Promise<string>;
  };
  await inflate(archive);
}

/** Launch Chromium for HTML→PDF. Uses @sparticuz/chromium on Vercel/Lambda. */
export async function launchPdfBrowser(): Promise<Browser> {
  if (!isServerless()) {
    const { chromium } = await import("playwright");
    return chromium.launch({ args: ["--no-sandbox"] });
  }

  ensureLambdaRuntimeHint();
  ensureChromiumLibraryPath();
  await clearIncompleteChromiumPack();

  const chromiumPack = (await import("@sparticuz/chromium")).default;
  const { chromium: playwright } = await import("playwright-core");

  chromiumPack.setGraphicsMode = false;

  const executablePath = await chromiumPack.executablePath();
  await inflateAl2023Libs();
  ensureChromiumLibraryPath();

  if (!existsSync(NSS_SO())) {
    throw new Error(
      "Chromium is missing libnss3.so after extract. PDF export cannot run on this serverless host.",
    );
  }

  return playwright.launch({
    args: chromiumPack.args,
    executablePath,
    headless: true,
    env: spawnEnv(),
  });
}
