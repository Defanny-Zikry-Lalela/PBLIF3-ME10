-- CreateTable
CREATE TABLE "DriverUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "driverId" TEXT NOT NULL,
    CONSTRAINT "DriverUser_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverId" TEXT NOT NULL,
    "driverUserId" TEXT NOT NULL,
    CONSTRAINT "DriverInvitation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverInvitation_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "DriverUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "portions" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "schoolId" TEXT NOT NULL,
    "deliveryId" TEXT,
    CONSTRAINT "Claim_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Claim_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Claim" ("createdAt", "id", "note", "portions", "schoolId", "status", "type") SELECT "createdAt", "id", "note", "portions", "schoolId", "status", "type" FROM "Claim";
DROP TABLE "Claim";
ALTER TABLE "new_Claim" RENAME TO "Claim";
CREATE UNIQUE INDEX "Claim_deliveryId_key" ON "Claim"("deliveryId");
CREATE INDEX "Claim_status_createdAt_idx" ON "Claim"("status", "createdAt");
CREATE TABLE "new_EmailOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitationId" TEXT,
    "driverInvitationId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailOutbox_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "SchoolInvitation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailOutbox_driverInvitationId_fkey" FOREIGN KEY ("driverInvitationId") REFERENCES "DriverInvitation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmailOutbox" ("attempts", "createdAt", "encryptedPayload", "id", "invitationId", "lastError", "nextAttemptAt", "recipient", "sentAt", "status", "subject") SELECT "attempts", "createdAt", "encryptedPayload", "id", "invitationId", "lastError", "nextAttemptAt", "recipient", "sentAt", "status", "subject" FROM "EmailOutbox";
DROP TABLE "EmailOutbox";
ALTER TABLE "new_EmailOutbox" RENAME TO "EmailOutbox";
CREATE UNIQUE INDEX "EmailOutbox_invitationId_key" ON "EmailOutbox"("invitationId");
CREATE UNIQUE INDEX "EmailOutbox_driverInvitationId_key" ON "EmailOutbox"("driverInvitationId");
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DriverUser_email_key" ON "DriverUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DriverUser_driverId_key" ON "DriverUser"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverInvitation_tokenHash_key" ON "DriverInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "DriverInvitation_expiresAt_acceptedAt_idx" ON "DriverInvitation"("expiresAt", "acceptedAt");
