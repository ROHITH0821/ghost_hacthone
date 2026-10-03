import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Reuse the client across hot reloads and (when applicable) warm serverless
// isolates so we don't open a new pool on every module evaluation.
globalForPrisma.prisma = db;
