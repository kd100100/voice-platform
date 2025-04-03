import React, { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Phone, MessageSquare, Wrench, FileText, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item } from "@/components/types";
import { generateAndDownloadCallAnalysisText } from "@/lib/call-analysis";
import { useRouter } from "next/navigation";

type TranscriptProps = {
  items: Item[];
  callStatus?: string;
};

const Transcript: React.FC<TranscriptProps> = ({ items, callStatus }) => {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  // Show messages, function calls, and function call outputs in the transcript
  const transcriptItems = items.filter(
    (it) =>
      it.type === "message" ||
      it.type === "function_call" ||
      it.type === "function_call_output"
  );

  // Log callStatus changes
  useEffect(() => {
    console.log("Transcript component - callStatus:", callStatus);
  }, [callStatus]);

  // Debug function to check if PDF button should be visible
  const shouldShowPdfButton = callStatus === "ended" && transcriptItems.length > 0;
  useEffect(() => {
    console.log("Should show PDF button:", shouldShowPdfButton, "callStatus:", callStatus, "items:", transcriptItems.length);
  }, [shouldShowPdfButton, callStatus, transcriptItems.length]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 h-full min-h-0 overflow-hidden flex flex-col p-0 relative">
        {/* Action buttons - Show when call is ended or when there are transcript items */}
        {(callStatus === "ended" || transcriptItems.length > 0) && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                // Generate and download transcript as text
                const transcriptText = transcriptItems.map(msg => {
                  const role = msg.role === "user" ? "Caller" : msg.role === "tool" ? "Tool" : "Assistant";
                  const content = msg.content ? msg.content.map(c => c.text || "").join("") : "";
                  return `${role} (${msg.timestamp || ""}): ${content}`;
                }).join("\n\n");
                
                // Create a blob and download it
                const blob = new Blob([transcriptText], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `call-transcript-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              disabled={transcriptItems.length === 0}
              title={transcriptItems.length === 0 ? "No transcript to download" : "Download transcript as text"}
            >
              <FileText className="h-4 w-4" />
              <span>Download as Text</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => generateAndDownloadCallAnalysisText(items)}
              disabled={transcriptItems.length === 0}
              title={transcriptItems.length === 0 ? "No transcript to analyze" : "Analyze call with GPT-4o and download as text"}
            >
              <BarChart className="h-4 w-4" />
              <span>Analyze Call</span>
            </Button>
          </div>
        )}
        
        {transcriptItems.length === 0 && (
          <div className="flex flex-1 h-full items-center justify-center mt-36">
            <div className="flex flex-col items-center gap-3 justify-center h-full">
              <div className="h-[140px] w-[140px] rounded-full bg-secondary/20 flex items-center justify-center">
                <MessageSquare className="h-16 w-16 text-foreground/10 bg-transparent" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground/60">
                  No messages yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Start a call to see the transcript
                </p>
              </div>
            </div>
          </div>
        )}
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 p-6">
            {transcriptItems.map((msg, i) => {
              const isUser = msg.role === "user";
              const isTool = msg.role === "tool";
              // Default to assistant if not user or tool
              const Icon = isUser ? Phone : isTool ? Wrench : Bot;

              // Combine all text parts into a single string for display
              // Ensure proper encoding for non-English characters
              const displayText = msg.content
                ? msg.content.map((c) => c.text || "").join("")
                : "";
              
              // Check if content contains non-English characters
              const hasNonEnglishChars = displayText.split('').some(char => char.charCodeAt(0) > 127);
              const hasDevanagariChars = /[\u0900-\u097F]/.test(displayText);

              return (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                      isUser
                        ? "bg-background border-border"
                        : isTool
                        ? "bg-secondary border-secondary"
                        : "bg-secondary border-secondary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-sm font-medium ${
                          isUser ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {isUser
                          ? "Caller"
                          : isTool
                          ? "Tool Response"
                          : "Assistant"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp}
                      </span>
                    </div>
                    {hasNonEnglishChars ? (
                      <div>
                        <p className="text-sm text-muted-foreground leading-relaxed break-words font-medium">
                          {displayText}
                        </p>
                        {hasDevanagariChars && (
                          <p className="text-xs text-blue-500 mt-1">
                            Hindi text detected
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        {displayText}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default Transcript;
