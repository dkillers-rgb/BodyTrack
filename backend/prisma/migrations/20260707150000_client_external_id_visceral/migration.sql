-- AlterTable
ALTER TABLE "clients" ADD COLUMN "external_id" TEXT;
ALTER TABLE "clients" ADD COLUMN "phone" TEXT;

UPDATE "clients" SET "external_id" = CAST("id" AS TEXT) WHERE "external_id" IS NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "height" REAL NOT NULL,
    "phone" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_clients" ("id", "external_id", "name", "gender", "age", "height", "phone", "created_at", "updated_at", "user_id")
SELECT "id", "external_id", "name", "gender", "age", "height", "phone", "created_at", "updated_at", "user_id" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE UNIQUE INDEX "clients_user_id_external_id_key" ON "clients"("user_id", "external_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

ALTER TABLE "evaluations" ADD COLUMN "visceral_fat" REAL;
