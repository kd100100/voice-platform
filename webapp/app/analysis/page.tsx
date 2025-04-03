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
        console.log("Analysis page - itemsParam:", itemsParam.substring(0, 100) + "...");
        const items = JSON.parse(decodeURIComponent(itemsParam));
        console.log("Analysis page - parsed items:", items.length, "items");
        
        const response = await fetch("/api/analyze-call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items }),
        });

        console.log("Analysis page - API response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Analysis page - API error:", errorText);
          throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("Analysis page - API response data:", data ? "Data received" : "No data");
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
        setError("Failed to analyze transcript. Please try again later.");
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

  // Generate PDF function
  const generatePDF = async () => {
    if (!analysis) return;
    
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Candidate Interview Analysis", 105, 15, { align: "center" });
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 25, { align: "center" });
    
    // Add content
    doc.setFontSize(10);
    let y = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const textWidth = pageWidth - 2 * margin;
    
    // Split analysis into lines that fit within the page width
    const splitText = doc.splitTextToSize(analysis, textWidth);
    
    // Add lines to PDF, creating new pages as needed
    for (let i = 0; i < splitText.length; i++) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(splitText[i], margin, y);
      y += 5;
    }
    
    // Save the PDF
    const filename = `candidate-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
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
            <Button variant="outline" onClick={generatePDF} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Download PDF</span>
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
