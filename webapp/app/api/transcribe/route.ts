import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { v4 as uuidv4 } from "uuid";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  console.log("API: transcribe endpoint called");
  
  try {
    // Get the audio data from the request
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      console.error("API: No audio file provided");
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }
    
    console.log("API: Audio file received", audioFile.name, audioFile.type, audioFile.size);
    
    // Create a temporary file to store the audio
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${uuidv4()}.${audioFile.name.split('.').pop()}`);
    
    // Convert the file to a buffer and write it to the temp file
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);
    
    console.log("API: Audio file saved to", tempFilePath);
    
    try {
      // Use OpenAI's transcription API
      console.log("API: Calling OpenAI transcription API");
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1", // Use whisper-1 for better multilingual support
        file: fs.createReadStream(tempFilePath) as any, // Type cast to any to avoid TypeScript error
        response_format: "text",
      });
      
      console.log("API: Transcription received", transcription);
      
      // Clean up the temp file
      fs.unlinkSync(tempFilePath);
      
      // Return the transcription
      return NextResponse.json({ transcription });
    } catch (error: any) {
      console.error("API: OpenAI transcription API error:", error);
      
      // Clean up the temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return NextResponse.json(
        { error: `OpenAI transcription API error: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
