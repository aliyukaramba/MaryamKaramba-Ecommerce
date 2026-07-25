/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `customer_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "customer_accounts" ADD COLUMN     "googleId" TEXT,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_googleId_key" ON "customer_accounts"("googleId");
