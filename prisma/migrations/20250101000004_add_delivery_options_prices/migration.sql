-- AlterTable
ALTER TABLE "PricingConfig" ADD COLUMN "individualPackagingPrice" REAL DEFAULT 0.10;
ALTER TABLE "PricingConfig" ADD COLUMN "newCartonPrice" REAL DEFAULT 2.00;
ALTER TABLE "Quote" ADD COLUMN "newCarton" BOOLEAN DEFAULT false;

