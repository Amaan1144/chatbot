import { NextResponse } from 'next/server';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { getVectorData, findSimilarChunks } from '../../../../lib/vectorStorage';

export async function POST(request) {
  try {
    const { question, docId } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    if (!docId) {
      return NextResponse.json({ error: "No document ID provided" }, { status: 400 });
    }

    // Step 1: Get embedding for the question
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: "embedding-001",
    });

    const queryEmbedding = await embeddings.embedQuery(question);

    // Step 2: Get stored vectors
    const vectorData = await getVectorData(docId);
    if (!vectorData) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Step 3: Find similar chunks
    const relevantChunks = await findSimilarChunks(docId, queryEmbedding);

    const contextText = relevantChunks.join("\n\n");

    const finalPrompt = `
You are a helpful assistant that provides accurate information based on the documents you have been given.

Answer the user's question based ONLY on the following context:
${contextText}

Question: ${question}

If you don't know the answer or can't find the information in the provided context, just say so - do not make up an answer.

Helpful Answer:
    `;

    // Step 4: Call Gemini 2.0 Flash API (v1beta)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: finalPrompt }]
        }]
      }),
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({ answer: data.candidates[0].content.parts[0].text });
    } else {
      return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
    }

  } catch (error) {
    console.error("Error answering question:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
