import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    const prompt = `
You are a helpful AI assistant. Answer the following question to the best of your ability:

Question: ${question}

Helpful Answer:
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
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
    console.error("Gemini General QA Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
