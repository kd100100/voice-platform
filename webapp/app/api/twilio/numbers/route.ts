import twilioClient from "@/lib/twilio";

export async function GET() {
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  try {
    const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      limit: 20,
    });
    return Response.json(incomingPhoneNumbers);
  } catch (error) {
    console.error("Error fetching Twilio phone numbers:", error);
    return Response.json(
      { error: "Failed to authenticate with Twilio. Please check your credentials." },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  try {
    const { phoneNumberSid, voiceUrl } = await req.json();
    const incomingPhoneNumber = await twilioClient
      .incomingPhoneNumbers(phoneNumberSid)
      .update({ voiceUrl });

    return Response.json(incomingPhoneNumber);
  } catch (error) {
    console.error("Error updating Twilio phone number:", error);
    return Response.json(
      { error: "Failed to authenticate with Twilio. Please check your credentials." },
      { status: 401 }
    );
  }
}
