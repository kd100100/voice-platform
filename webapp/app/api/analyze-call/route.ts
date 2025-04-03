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
      You are an expert recruitment analyst evaluating an initial screening call for frontline sales staff positions.
      The AI assistant in this conversation was conducting an initial screening interview to check the basic qualifications of the candidate.
      
      Please analyze this interview and provide detailed insights including:
      
      1. Summary of the candidate's background and experience
      2. Key qualifications and skills mentioned
      3. Communication skills assessment (clarity, articulation, listening)
      4. Sales aptitude indicators
      5. Red flags or concerns (if any)
      6. Overall candidate evaluation
      7. HIRING RECOMMENDATION: Provide a clear GO/NO GO recommendation with brief justification
      
      Format your response with clear headings and bullet points where appropriate.
      Make your analysis concise but thorough, focusing on factors relevant to frontline sales positions.
      
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
