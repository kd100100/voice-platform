import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { Item } from "@/components/types";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  console.log("API: analyze-call endpoint called");
  
  try {
    const body = await req.json();
    console.log("API: Request body received", typeof body, body ? "has content" : "empty");
    
    const { items } = body;
    
    if (!items || !Array.isArray(items)) {
      console.error("API: Invalid items array", items);
      return NextResponse.json(
        { error: "Invalid request. 'items' array is required." },
        { status: 400 }
      );
    }
    
    console.log("API: Items array length", items.length);

    // Filter items to only include messages
    const transcriptItems = items.filter(
      (it: Item) => it.type === "message"
    );

    // Format transcript for analysis
    const formattedTranscript = transcriptItems.map((item: Item) => {
      const role = item.role === "user" ? "Caller" : "Assistant";
      const content = item.content ? item.content.map((c: { text: string }) => c.text).join("") : "";
      
      // Try to detect if the content is in a non-English language
      // and add a note about it for the analyzer
      let languageNote = "";
      if (content && !/^[A-Za-z0-9\s.,?!;:'"()\-_]*$/.test(content)) {
        // Contains non-ASCII characters, likely non-English
        languageNote = " [Note: This message may be in a non-English language]";
      }
      
      return `${role}: ${content}${languageNote}`;
    }).join("\n\n");

    // Check if the transcript contains non-English content
    const hasNonEnglishContent = formattedTranscript.includes("[Note: This message may be in a non-English language]");

    // Prompt for analysis
    const prompt = `
      You are an expert recruitment analyst evaluating an initial screening call for frontline sales staff positions.
      The AI assistant in this conversation was conducting an initial screening interview to check the basic qualifications of the candidate.
      
      ${hasNonEnglishContent ? "IMPORTANT: This transcript contains content in a non-English language. Please do your best to analyze it, focusing on any English portions and the overall structure of the conversation." : ""}
      
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

    console.log("API: Calling OpenAI API");
    try {
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

      console.log("API: OpenAI API response received");
      
      // Return the analysis
      const analysis = completion.choices[0].message.content || "No analysis available";
      console.log("API: Analysis length", analysis.length);
      return NextResponse.json({ analysis });
    } catch (error: any) {
      console.error("API: OpenAI API error:", error);
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error analyzing call transcript:", error);
    return NextResponse.json(
      { error: "Failed to analyze call transcript" },
      { status: 500 }
    );
  }
}
