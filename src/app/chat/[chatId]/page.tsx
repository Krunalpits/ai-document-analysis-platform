import React from "react";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import ChatSideBar from "@/components/ui/ChatSideBar";
import PDFViewer from "@/components/ui/PDFViewer";
import ChatComponent from "@/components/ui/ChatComponent";

type Props = {
  params: {
    chatId: string;
  };
};

const ChatPage = async ({ params }: Props) => {
  const { chatId } = await params;

  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  const _chats = await db.select().from(chats).where(eq(chats.userId, userId));
  if (!_chats || _chats.length === 0) return redirect("/");
 
  const chatIdNum = parseInt(chatId, 10);
  if (!_chats.find((chat) => chat.id === chatIdNum)) return redirect("/");

const currentChat = _chats.find((chat) => chat.id === parseInt(chatId));
console.log("PDF URL:", currentChat?.pdfUrl);

  return (
    <div className="flex max-h-screen overflow-scroll">
      <div className="flex w-full max-h-screen overflow-scroll">
        <div className="flex-[1] max-w-xs">
          <ChatSideBar chats={_chats} chatId={chatIdNum} />
        </div>

        <div className="max-h-screen p-4 overflow-scroll flex-[5]">
         <PDFViewer pdf_url={currentChat?.pdfUrl || ""} />
        </div>

        <div className="flex-[3] border-l-4 border-l-slate-200">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;