-- AddForeignKey
ALTER TABLE "VirtualRecord" ADD CONSTRAINT "VirtualRecord_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
