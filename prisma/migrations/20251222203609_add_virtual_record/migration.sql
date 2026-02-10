-- CreateTable
CREATE TABLE "VirtualRecord" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VirtualRecord_chatId_collection_idx" ON "VirtualRecord"("chatId", "collection");
