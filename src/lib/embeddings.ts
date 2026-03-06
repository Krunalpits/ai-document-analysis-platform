// src/lib/embeddings.ts
import { OpenAIApi, Configuration } from "openai-edge";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function getEmbedding(input: string) {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: input.replace(/\n/g, " "),
  });

  const result = await response.json();

  // If OpenAI returns an error, this prevents `result.data[0]` crashes
  if (!response.ok) {
    console.log("OpenAI Embedding ERROR:", result);
    throw new Error(
      result?.error?.message || `OpenAI embedding failed (status ${response.status})`
    );
  }

  return result.data[0].embedding as number[];
}