import { NextResponse } from 'next/server';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { getVectorData, findSimilarChunks } from '../../../../lib/vectorStorage';

export async function POST(request) {
  try {
    const { question, docIds } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return NextResponse.json({ error: "No document IDs provided" }, { status: 400 });
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: "embedding-001",
    });

    const queryEmbedding = await embeddings.embedQuery(question);

    let allChunks = [];

    for (const docId of docIds) {
      const vectorData = await getVectorData(docId);
      if (!vectorData) {
        console.warn(`Vector data not found for docId: ${docId}`);
        continue; // Skip missing docs
      }

      const chunks = await findSimilarChunks(docId, queryEmbedding);
      allChunks.push(...chunks);
    }

    if (allChunks.length === 0) {
      return NextResponse.json({ error: "No relevant context found in documents." }, { status: 404 });
    }

    const contextText = allChunks.join("\n\n");

    const finalPrompt = `
You are a helpful assistant that provides accurate information based on the documents you have been given.

Answer the user's question based ONLY on the following context:
${contextText}

Question: ${question}

If you don't know the answer or can't find the information in the provided context, just say so - do not make up an answer.

Helpful Answer:
    `;

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
