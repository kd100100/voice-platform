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
    
    const { items, transcriptText } = body;
    
    if ((!items || !Array.isArray(items)) && !transcriptText) {
      console.error("API: Invalid request - need either items array or transcriptText");
      return NextResponse.json(
        { error: "Invalid request. Either 'items' array or 'transcriptText' is required." },
        { status: 400 }
      );
    }
    
    let formattedTranscript = "";
    let hasHindiContent = false;
    let hasNonEnglishContent = false;
    
    // If transcriptText is provided, use it directly
    if (transcriptText) {
      console.log("API: Using provided transcript text, length:", transcriptText.length);
      formattedTranscript = transcriptText;
      
      // Check for Hindi or non-English content
      hasHindiContent = /[\u0900-\u097F]/.test(transcriptText);
      hasNonEnglishContent = transcriptText.split('').some((char: string) => char.charCodeAt(0) > 127);
    } 
    // Otherwise, format transcript from items
    else if (items && items.length > 0) {
      console.log("API: Items array length", items.length);
      
      // Filter items to only include messages
      const transcriptItems = items.filter(
        (it: Item) => it.type === "message"
      );
      
      // Format transcript for analysis
      formattedTranscript = transcriptItems.map((item: Item) => {
        const role = item.role === "user" ? "Caller" : "Assistant";
        const content = item.content ? item.content.map((c: { text: string }) => c.text).join("") : "";
        
        // Detect language
        let languageNote = "";
        const hasNonEnglishChars = content.split('').some((char: string) => char.charCodeAt(0) > 127);
        
        if (hasNonEnglishChars) {
          // Try to detect if it's Hindi (common in this application context)
          const hasDevanagariChars = /[\u0900-\u097F]/.test(content);
          if (hasDevanagariChars) {
            languageNote = " [Hindi content]";
            hasHindiContent = true;
          } else {
            languageNote = " [Non-English content]";
            hasNonEnglishContent = true;
          }
        }
        
        return `${role}: ${content}${languageNote}`;
      }).join("\n\n");
    }
    
    console.log("API: Formatted transcript length:", formattedTranscript.length);

    // Prompt for analysis
    const prompt = `
      You are an expert recruitment analyst evaluating an initial screening call for frontline sales staff positions.
      The AI assistant in this conversation was conducting an initial screening interview to check the basic qualifications of the candidate.
      
      ${hasHindiContent ? "IMPORTANT: This transcript contains content in Hindi. As a multilingual analyzer, please analyze both Hindi and English portions of the conversation." : ""}
      ${hasNonEnglishContent ? "IMPORTANT: This transcript contains content in a non-English language. Please do your best to analyze it, focusing on the overall structure of the conversation." : ""}
      
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
      // Call OpenAI API with GPT-4o which has better multilingual capabilities
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert multilingual call analyzer providing detailed insights on conversation transcripts. You can understand and analyze content in multiple languages including Hindi. Your analysis should be thorough, well-structured, and include clear headings and bullet points."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7, // Slightly higher temperature for more nuanced analysis
        max_tokens: 2000, // Ensure we get a complete analysis
      });

      console.log("API: OpenAI API response received");
      
      // Return the analysis
      const analysis = completion.choices[0].message.content || "No analysis available";
      console.log("API: Analysis length", analysis.length);
      
      // Add default analysis if the response is too short or empty
      if (!analysis || analysis.length < 50) {
        console.log("API: Analysis too short, providing default analysis");
        const defaultAnalysis = `
CANDIDATE SUMMARY:
The transcript provided does not contain sufficient information to perform a complete analysis.

KEY QUALIFICATIONS:
* Unable to determine from the provided transcript

COMMUNICATION SKILLS:
* Unable to assess fully from the provided transcript

SALES APTITUDE:
* Insufficient data to evaluate

RED FLAGS:
* Incomplete or unclear transcript data

OVERALL EVALUATION:
The transcript appears to be incomplete or contains non-standard content that makes analysis difficult. It's recommended to review the audio recording directly or conduct another interview.

HIRING RECOMMENDATION: NO GO
Based on the limited information available, we cannot recommend proceeding with this candidate at this time. A more complete interview transcript would be needed for proper evaluation.
`;
        return NextResponse.json({ analysis: defaultAnalysis });
      }
      
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
