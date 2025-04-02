import twilioClient from "@/lib/twilio";

export async function POST(req: Request) {
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  try {
    const { to, from } = await req.json();
    
    if (!to || !from) {
      return Response.json(
        { error: "Missing required parameters: 'to' and 'from' phone numbers are required" },
        { status: 400 }
      );
    }

    // Get the webhook URL from environment variable or use a default
    const twimlUrl = process.env.TWILIO_WEBHOOK_URL || "";
    
    if (!twimlUrl) {
      return Response.json(
        { error: "Webhook URL not configured. Please set TWILIO_WEBHOOK_URL in your environment variables." },
        { status: 500 }
      );
    }

    // Initiate the call
    const call = await twilioClient.calls.create({
      to: to,
      from: from,
      url: twimlUrl,
    });

    return Response.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error("Error initiating Twilio call:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { 
        error: "Failed to initiate call", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
