import twilioClient from "@/lib/twilio";

export async function GET() {
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  try {
    // Get the webhook URL from the environment
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || "";
    
    if (!webhookUrl) {
      return Response.json(
        { error: "Webhook URL not configured. Please set TWILIO_WEBHOOK_URL in your environment variables." },
        { status: 500 }
      );
    }

    // Get all phone numbers
    const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      limit: 20,
    });

    if (incomingPhoneNumbers.length === 0) {
      return Response.json(
        { error: "No phone numbers found in your Twilio account." },
        { status: 404 }
      );
    }

    // Check each phone number and update if the webhook URL is incorrect
    const updates = [];
    for (const phoneNumber of incomingPhoneNumbers) {
      // Check if the webhook URL is correct
      const correctWebhookUrl = `${webhookUrl}/twiml`;
      
      if (phoneNumber.voiceUrl !== correctWebhookUrl) {
        // Update the webhook URL
        const updatedPhoneNumber = await twilioClient
          .incomingPhoneNumbers(phoneNumber.sid)
          .update({ voiceUrl: correctWebhookUrl });
        
        updates.push({
          phoneNumber: phoneNumber.friendlyName,
          oldUrl: phoneNumber.voiceUrl,
          newUrl: updatedPhoneNumber.voiceUrl,
        });
      } else {
        updates.push({
          phoneNumber: phoneNumber.friendlyName,
          status: "Already correct",
          url: phoneNumber.voiceUrl,
        });
      }
    }

    return Response.json({ 
      success: true, 
      message: "Webhook URLs checked and updated if needed.",
      updates 
    });
  } catch (error) {
    console.error("Error updating Twilio webhook URLs:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { 
        error: "Failed to update webhook URLs", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
