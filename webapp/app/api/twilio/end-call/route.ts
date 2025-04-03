import { NextResponse } from "next/server";
import twilioClient from "@/lib/twilio";

export async function POST(req: Request) {
  if (!twilioClient) {
    return NextResponse.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  try {
    const { callSid } = await req.json();
    
    if (!callSid) {
      return NextResponse.json(
        { error: "Missing required parameter: 'callSid' is required" },
        { status: 400 }
      );
    }

    // End the call using Twilio API
    await twilioClient.calls(callSid).update({
      status: "completed"
    });

    return NextResponse.json({ success: true, message: "Call ended successfully" });
  } catch (error) {
    console.error("Error ending Twilio call:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to end call", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
