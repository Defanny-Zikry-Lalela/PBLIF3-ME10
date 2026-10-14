-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailOutbox" (
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
    CONSTRAINT "EmailOutbox_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "SchoolInvitation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmailOutbox" ("attempts", "createdAt", "encryptedPayload", "id", "invitationId", "lastError", "nextAttemptAt", "recipient", "sentAt", "status", "subject") SELECT "attempts", "createdAt", "encryptedPayload", "id", "invitationId", "lastError", "nextAttemptAt", "recipient", "sentAt", "status", "subject" FROM "EmailOutbox";
DROP TABLE "EmailOutbox";
ALTER TABLE "new_EmailOutbox" RENAME TO "EmailOutbox";
CREATE UNIQUE INDEX "EmailOutbox_invitationId_key" ON "EmailOutbox"("invitationId");
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
