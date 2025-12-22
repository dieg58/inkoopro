-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "odooId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "step" TEXT NOT NULL DEFAULT 'products',
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientCompany" TEXT,
    "clientPhone" TEXT,
    "deliveryType" TEXT NOT NULL,
    "deliveryAddress" JSONB,
    "billingAddressDifferent" BOOLEAN NOT NULL DEFAULT false,
    "billingAddress" JSONB,
    "delayWorkingDays" INTEGER NOT NULL,
    "delayType" TEXT NOT NULL,
    "delayExpressDays" INTEGER,
    "selectedProducts" JSONB NOT NULL,
    "markings" JSONB NOT NULL,
    "quoteItems" JSONB NOT NULL,
    "totalHT" REAL NOT NULL,
    "totalTTC" REAL,
    "odooOrderId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "submittedAt" DATETIME,
    CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "odooId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "category" TEXT,
    "colors" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "variantPrices" TEXT,
    "lastSync" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ServicePricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technique" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "quantityRanges" TEXT NOT NULL,
    "colorCounts" TEXT,
    "pointRanges" TEXT,
    "dimensions" TEXT,
    "prices" TEXT NOT NULL,
    "fixedFeePerColor" REAL,
    "fixedFeeSmallDigitization" REAL,
    "fixedFeeLargeDigitization" REAL,
    "smallDigitizationThreshold" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "textileDiscountPercentage" REAL NOT NULL DEFAULT 30,
    "clientProvidedIndexation" REAL NOT NULL DEFAULT 10,
    "expressSurchargePercent" REAL NOT NULL DEFAULT 10,
    "updatedAt" DATETIME NOT NULL
);

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
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_odooId_key" ON "Client"("odooId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_odooId_idx" ON "Client"("odooId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_odooOrderId_key" ON "Quote"("odooOrderId");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCache_odooId_key" ON "ProductCache"("odooId");

-- CreateIndex
CREATE INDEX "ProductCache_odooId_idx" ON "ProductCache"("odooId");

-- CreateIndex
CREATE INDEX "ProductCache_category_idx" ON "ProductCache"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePricing_technique_key" ON "ServicePricing"("technique");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOdooMapping_technique_textileType_key" ON "ServiceOdooMapping"("technique", "textileType");
