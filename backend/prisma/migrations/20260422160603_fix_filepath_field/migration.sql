/*
  Warnings:

  - You are about to drop the column `path` on the `MediaItem` table. All the data in the column will be lost.
  - Added the required column `filePath` to the `MediaItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MediaItem" DROP COLUMN "path",
ADD COLUMN     "filePath" TEXT NOT NULL;
