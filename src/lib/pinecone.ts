import { Pinecone, PineconeRecord, RecordMetadata } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbedding } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(filekey: string) {
  console.log("downloading s3 into file system");
  const file_name = await downloadFromS3(filekey);
  if (!file_name) {
    throw new Error("Could not download file from S3");
  }

  console.log("loading pdf into memory:", file_name);
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  const documents = await Promise.all(pages.map(prepareDocument));

  const vectors = (await Promise.all(
    documents.flat().map(embedDocument)
  )) as PineconeRecord<RecordMetadata>[];

  const client = getPineconeClient();
  const index = client.index("ai-document-analysis-platform");
  const namespace = index.namespace(convertToAscii(filekey));

  console.log("inserting vectors into pinecone", vectors.length);

await namespace.upsert(vectors as any);

  return documents[0];
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbedding(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord<RecordMetadata>;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, " ");

  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);

  return docs;
}