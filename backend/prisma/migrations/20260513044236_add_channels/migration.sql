-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "channelId" TEXT;

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "ctaLink" TEXT NOT NULL,
    "modelName" TEXT,
    "modelProfession" TEXT,
    "modelCharacteristics" TEXT,
    "modelPersonality" TEXT,
    "copyExamples" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
