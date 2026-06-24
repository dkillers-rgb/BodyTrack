-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "clients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "height" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" INTEGER NOT NULL,
    "exam_date" DATETIME NOT NULL,
    "weight" REAL NOT NULL,
    "skeletal_muscle" REAL NOT NULL,
    "body_fat" REAL NOT NULL,
    "image_path" TEXT,
    "raw_ocr_text" TEXT,
    "ai_analysis" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "evaluations_client_id_exam_date_idx" ON "evaluations"("client_id", "exam_date");
