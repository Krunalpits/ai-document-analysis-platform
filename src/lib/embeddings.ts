import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function getEmbeddings(input: string) {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: input.replace(/\n/g, " "),
    });
    return response.data[0].embedding as number[];
}

// Alias so pinecone.ts can use the old name
export const getEmbedding = getEmbeddings;