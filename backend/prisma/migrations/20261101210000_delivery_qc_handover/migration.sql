ALTER TABLE "Delivery" ADD COLUMN "qcStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Delivery" ADD COLUMN "qcCondition" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "handoverPin" TEXT;

CREATE UNIQUE INDEX "Delivery_handoverPin_key" ON "Delivery"("handoverPin");
