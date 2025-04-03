import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { Item } from "@/components/types";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { items } = await req.json();
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid request. 'items' array is required." },
        { status: 400 }
      );
    }

    // Filter items to only include messages
    const transcriptItems = items.filter(
      (it: Item) => it.type === "message"
    );

    // Format transcript for analysis
    const formattedTranscript = transcriptItems.map((item: Item) => {
      const role = item.role === "user" ? "Caller" : "Assistant";
      const content = item.content ? item.content.map((c: any) => c.text).join("") : "";
      return `${role}: ${content}`;
    }).join("\n\n");

    // Prompt for analysis
    const prompt = `
      You are an expert call analyzer. Below is a transcript of a conversation between a caller and an AI assistant.
      Please analyze this conversation and provide detailed insights including:
      
      1. Summary of the conversation
      2. Key points discussed
      3. Sentiment analysis (was the caller satisfied, frustrated, etc.)
      4. Areas where the assistant performed well
      5. Areas where the assistant could improve
      6. Any action items or follow-ups identified
      7. Overall verdict on the effectiveness of the call
      
      Format your response with clear headings and bullet points where appropriate.
      
      Transcript:
      ${formattedTranscript}
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert call analyzer providing detailed insights on conversation transcripts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    // Return the analysis
    const analysis = completion.choices[0].message.content || "No analysis available";
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing call transcript:", error);
    return NextResponse.json(
      { error: "Failed to analyze call transcript" },
      { status: 500 }
    );
  }
}
