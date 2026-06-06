-- AddTemplate model and order field
ALTER TABLE "Post" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "data" TEXT NOT NULL,
    "ctaLink" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Template" ADD CONSTRAINT "Template_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Template_channelId_type_idx" ON "Template"("channelId", "type");
CREATE INDEX "Template_channelId_type_order_idx" ON "Template"("channelId", "type", "order");
