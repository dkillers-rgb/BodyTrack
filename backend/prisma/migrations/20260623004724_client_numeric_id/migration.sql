/*
  Warnings:

  - The primary key for the `clients` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `clients` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `client_id` on the `evaluations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_client_id_fkey";

-- AlterTable
ALTER TABLE "clients" DROP CONSTRAINT "clients_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "client_id",
ADD COLUMN     "client_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "evaluations_client_id_exam_date_idx" ON "evaluations"("client_id", "exam_date");

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
