-- CreateTable
CREATE TABLE "FixShare" (
    "id" TEXT NOT NULL,
    "fixId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FixShare_fixId_key" ON "FixShare"("fixId");

-- AddForeignKey
ALTER TABLE "FixShare" ADD CONSTRAINT "FixShare_fixId_fkey" FOREIGN KEY ("fixId") REFERENCES "FixStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

