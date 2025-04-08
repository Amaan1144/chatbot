// app/api/process-pdf/route.js
import { NextResponse } from 'next/server';
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// Import custom storage for Vercel
import { saveVectorData } from '../../../../lib/vectorStorage';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create temp file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, file.name);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Write file to disk
    fs.writeFileSync(tempFilePath, buffer);
    
    // Load PDF
    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();
    
    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const splitDocs = await textSplitter.splitDocuments(docs);
    
    // Initialize embeddings with Google Gemini
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: "embedding-001",
    });
    
    // Create vector embeddings
    const vectors = [];
    
    for (const doc of splitDocs) {
      const embedding = await embeddings.embedQuery(doc.pageContent);
      vectors.push({
        content: doc.pageContent,
        embedding,
        metadata: doc.metadata
      });
    }
    
    // Generate a unique ID for this document
    const docId = `doc_${Date.now()}`;
    
    // Save vector data to our storage system
   const result = await saveVectorData(docId, vectors);

    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return NextResponse.json({ 
      message: "PDF processed successfully", 
      docId,
      pageCount: docs.length,
      chunkCount: splitDocs.length
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}