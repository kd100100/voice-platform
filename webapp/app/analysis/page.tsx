"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const itemsParam = searchParams.get("items");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<"GO" | "NO GO" | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!itemsParam) {
        setError("No transcript data provided");
        setLoading(false);
        return;
      }

      try {
        console.log("Analysis page - itemsParam length:", itemsParam.length);
        
        // Decode and parse the items
        let items;
        try {
          items = JSON.parse(decodeURIComponent(itemsParam));
          console.log("Analysis page - parsed items:", items.length, "items");
          
          // Log the first few items for debugging
          if (items.length > 0) {
            console.log("First item sample:", JSON.stringify(items[0]).substring(0, 200));
          }
        } catch (parseError) {
          console.error("Error parsing items:", parseError);
          setError("Failed to parse transcript data. The data may be corrupted.");
          setLoading(false);
          return;
        }
        
        // Filter to only include message items
        const messageItems = items.filter(item => item.type === "message");
        console.log("Filtered to", messageItems.length, "message items");
        
        if (messageItems.length === 0) {
          setError("No message content found in the transcript");
          setLoading(false);
          return;
        }
        
        // Make the API request
        console.log("Making API request to analyze call...");
        const response = await fetch("/api/analyze-call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items: messageItems }),
        });

        console.log("Analysis page - API response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Analysis page - API error:", errorText);
          throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("Analysis page - API response received, analysis length:", data.analysis?.length || 0);
        
        if (!data.analysis) {
          setError("No analysis was returned from the API");
          setLoading(false);
          return;
        }
        
        setAnalysis(data.analysis);
        
        // Determine recommendation from analysis text
        if (data.analysis.includes("GO RECOMMENDATION") || 
            data.analysis.includes("RECOMMENDATION: GO") ||
            data.analysis.toLowerCase().includes("go recommendation")) {
          setRecommendation("GO");
        } else if (data.analysis.includes("NO GO RECOMMENDATION") || 
                  data.analysis.includes("RECOMMENDATION: NO GO") ||
                  data.analysis.toLowerCase().includes("no go recommendation")) {
          setRecommendation("NO GO");
        }
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setError(`Failed to analyze transcript: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [itemsParam]);

  // Function to convert analysis text to formatted HTML
  const formatAnalysis = (text: string) => {
    if (!text) return "";

    // Replace headings (lines in all caps or ending with a colon)
    let formatted = text.replace(/^([A-Z][A-Z\s]+[A-Z]|\w+:)$/gm, (match) => 
      `<h2 class="text-xl font-bold mt-6 mb-3 text-primary">${match}</h2>`
    );

    // Replace bullet points
    formatted = formatted.replace(/^[\s]*[-•*][\s](.+)$/gm, 
      '<li class="ml-5 mb-2">$1</li>'
    );

    // Wrap bullet point lists in ul tags
    formatted = formatted.replace(/<\/li>\n(?!<li)/g, '</li></ul>\n');
    formatted = formatted.replace(/(?<!<\/ul>\n)<li/g, '<ul class="list-disc my-3">\n<li');

    // Add paragraph tags to regular text (not headings or list items)
    formatted = formatted.replace(/^(?!<h2|<ul|<li|<\/ul>)(.+)$/gm, 
      '<p class="mb-3 text-gray-700">$1</p>'
    );

    // Highlight key terms
    formatted = formatted.replace(/(GO RECOMMENDATION|NO GO RECOMMENDATION|RECOMMENDATION: GO|RECOMMENDATION: NO GO)/g, 
      '<span class="font-bold text-primary">$1</span>'
    );

    return formatted;
  };

  // Generate text function
  const downloadAnalysisAsText = () => {
    if (!analysis) return;
    
    try {
      // Create a blob and download it
      const blob = new Blob([analysis], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-analysis-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading analysis:", error);
      alert("There was an error downloading the analysis. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="flex flex-col items-center justify-center p-10">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <h2 className="text-2xl font-bold">Analyzing Interview...</h2>
            <p className="text-muted-foreground mt-2">
              Our AI is evaluating the candidate&apos;s interview. This may take a moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="flex flex-col items-center justify-center p-10">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold">Analysis Error</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button asChild className="mt-6">
              <Link href="/">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Candidate Interview Analysis</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadAnalysisAsText} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Download as Text</span>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>

        {recommendation && (
          <Card className={`mb-6 border-4 ${recommendation === "GO" ? "border-green-500" : "border-red-500"}`}>
            <CardContent className="p-6 flex items-center gap-4">
              {recommendation === "GO" ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  Hiring Recommendation: 
                  <Badge className={`ml-2 text-lg py-1 px-3 ${recommendation === "GO" ? "bg-green-500" : "bg-red-500"}`}>
                    {recommendation}
                  </Badge>
                </h2>
                <p className="text-gray-600">
                  {recommendation === "GO" 
                    ? "This candidate meets the basic qualifications for the frontline sales position."
                    : "This candidate does not meet the basic qualifications for the frontline sales position."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <div 
                className="analysis-content" 
                dangerouslySetInnerHTML={{ __html: formatAnalysis(analysis) }}
              />
            ) : (
              <p>No analysis available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
