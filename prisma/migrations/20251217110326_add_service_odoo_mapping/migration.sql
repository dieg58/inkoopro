-- CreateTable
CREATE TABLE "ServiceOdooMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technique" TEXT NOT NULL,
    "odooProductName" TEXT NOT NULL,
    "textileType" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOdooMapping_technique_key" ON "ServiceOdooMapping"("technique");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOdooMapping_technique_textileType_key" ON "ServiceOdooMapping"("technique", "textileType");
