-- CreateTable
CREATE TABLE "ServiceOdooMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technique" TEXT NOT NULL,
    "odooProductName" TEXT NOT NULL,
    "textileType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOdooMapping_technique_key" ON "ServiceOdooMapping"("technique");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOdooMapping_technique_textileType_key" ON "ServiceOdooMapping"("technique", "textileType");
