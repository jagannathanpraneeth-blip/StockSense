ALTER TABLE "User" ADD COLUMN "passwordChangedAt" DATETIME;
ALTER TABLE "OperationLine" ADD COLUMN "balanceSnapshot" REAL;
ALTER TABLE "StockBalance" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OperationLine" ADD COLUMN "balanceVersionSnapshot" INTEGER;
