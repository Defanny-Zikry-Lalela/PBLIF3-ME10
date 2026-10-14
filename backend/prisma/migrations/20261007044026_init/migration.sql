-- CreateTable
CREATE TABLE "SchoolUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "SchoolUser_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,
    "schoolUserId" TEXT NOT NULL,
    CONSTRAINT "SchoolInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchoolInvitation_schoolUserId_fkey" FOREIGN KEY ("schoolUserId") REFERENCES "SchoolUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitationId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailOutbox_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "SchoolInvitation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NutritionIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "calories" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbohydrates" REAL NOT NULL,
    "fat" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "MealMenu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "educationLevel" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "productionNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MenuIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amountGrams" REAL NOT NULL,
    CONSTRAINT "MenuIngredient_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "MealMenu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "NutritionIngredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "portions" INTEGER NOT NULL,
    CONSTRAINT "MenuRecipient_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "MealMenu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuRecipient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "portions" INTEGER NOT NULL,
    "departureTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "statusNote" TEXT,
    "receivedAt" TEXT,
    "schoolId" TEXT NOT NULL,
    "driverId" TEXT,
    CONSTRAINT "Delivery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Delivery" ("date", "departureTime", "driverId", "id", "portions", "receivedAt", "schoolId", "status", "statusNote") SELECT "date", "departureTime", "driverId", "id", "portions", "receivedAt", "schoolId", "status", "statusNote" FROM "Delivery";
DROP TABLE "Delivery";
ALTER TABLE "new_Delivery" RENAME TO "Delivery";
CREATE INDEX "Delivery_date_status_idx" ON "Delivery"("date", "status");
CREATE UNIQUE INDEX "Delivery_date_schoolId_key" ON "Delivery"("date", "schoolId");
CREATE TABLE "new_School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "educationLevel" TEXT NOT NULL DEFAULT 'SD',
    "targetPupils" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_School" ("address", "id", "isActive", "name") SELECT "address", "id", "isActive", "name" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");
CREATE UNIQUE INDEX "School_email_key" ON "School"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SchoolUser_email_key" ON "SchoolUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolUser_schoolId_key" ON "SchoolUser"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolInvitation_tokenHash_key" ON "SchoolInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "SchoolInvitation_expiresAt_acceptedAt_idx" ON "SchoolInvitation"("expiresAt", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_invitationId_key" ON "EmailOutbox"("invitationId");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionIngredient_name_key" ON "NutritionIngredient"("name");

-- CreateIndex
CREATE INDEX "MealMenu_date_educationLevel_idx" ON "MealMenu"("date", "educationLevel");

-- CreateIndex
CREATE UNIQUE INDEX "MenuIngredient_menuId_ingredientId_key" ON "MenuIngredient"("menuId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuRecipient_menuId_schoolId_key" ON "MenuRecipient"("menuId", "schoolId");
