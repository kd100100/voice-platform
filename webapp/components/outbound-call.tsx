"use client";

import { useState } from "react";
import type { FC } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type OutboundCallProps = {
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
};

const OutboundCall: FC<OutboundCallProps> = ({
  selectedPhoneNumber,
  allConfigsReady,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFixingWebhook, setIsFixingWebhook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const fixWebhook = async () => {
    setIsFixingWebhook(true);
    setWebhookStatus(null);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/twilio/fix-webhook");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to fix webhook URL");
      }

      setWebhookStatus("Webhook URLs updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred while fixing webhook");
    } finally {
      setIsFixingWebhook(false);
    }
  };

  const initiateCall = async () => {
    if (!phoneNumber) {
      setError("Please enter a phone number to call");
      return;
    }

    if (!selectedPhoneNumber) {
      setError("No Twilio phone number selected");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/twilio/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phoneNumber,
          from: selectedPhoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to initiate call");
      }

      setSuccess(`Call initiated successfully! Call SID: ${data.callSid}`);
      setPhoneNumber("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Make Outbound Call</h3>
          <Phone className="h-5 w-5 text-gray-500" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-number">Phone Number to Call</Label>
          <div className="flex space-x-2">
            <Input
              id="phone-number"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading || !allConfigsReady}
            />
            <Button
              onClick={initiateCall}
              disabled={isLoading || !allConfigsReady || !phoneNumber}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calling...
                </>
              ) : (
                "Call"
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Enter phone number in E.164 format (e.g., +1234567890)
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!allConfigsReady && (
          <Alert>
            <AlertDescription>
              Complete the setup checklist to enable outbound calling
            </AlertDescription>
          </Alert>
        )}

        {/* Webhook Fix Section */}
        <div className="border-t pt-4 mt-2">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Having trouble with incoming calls?</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fixWebhook}
                disabled={isFixingWebhook}
                className="flex items-center"
              >
                {isFixingWebhook ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Fix Webhook URL
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              If incoming calls are disconnecting immediately, click the button above to fix the webhook URL configuration.
            </p>
            {webhookStatus && (
              <Alert className="mt-2">
                <AlertDescription>{webhookStatus}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default OutboundCall;
