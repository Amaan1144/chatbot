import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: "embedding-001"
});

export async function saveVectorData(docId, vectors) {
  const documents = vectors.map(v => ({
    doc_id: docId,
    content: v.content,
    embedding: v.embedding,
    metadata: v.metadata || {},
  }));

  const { data, error } = await supabaseClient
    .from('documents')
    .insert(documents);

  if (error) {
    console.error("Error saving vector data to Supabase:", error);
    throw error;
  }
  return docId;
}

export async function getVectorData(docId) {
  const { data, error } = await supabaseClient
    .from("documents")
    .select("*")
    .eq("doc_id", docId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findSimilarChunks(docId, queryEmbedding, k = 5) {
  const { data, error } = await supabaseClient.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: k,
    p_doc_id: docId
  });
console.log("data", data);
  if (error) throw new Error(error.message);

  return data.map(d => d.content);
}
