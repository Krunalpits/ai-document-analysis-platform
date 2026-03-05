import { NextResponse, NextRequest } from "next/server";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { db } from "@/lib/db";
import { getS3Url } from "@/lib/s3";
import { getAuth } from "@clerk/nextjs/server";
import { chats } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  try {
    const body = await req.json();
    const { file_key, file_name } = body;

    console.log(file_key, file_name);
    await loadS3IntoPinecone(file_key);
    const chat_Id = await db.insert(chats).values({
      fileKey: file_key,
      pdfName: file_name,
      pdfUrl: getS3Url(file_key),
      userId: userId,
    }).returning({
      insertedId: chats.id
    });
    return NextResponse.json({
      chat_Id: chat_Id[0].insertedId
    },{status: 200})
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
