import type { Item } from "@/components/types";

/**
 * Analyzes a call transcript using OpenAI's GPT-4o model via API
 * @param items Transcript items to analyze
 * @returns Analysis result as a string
 */
export async function analyzeCallTranscript(items: Item[]): Promise<string> {
  try {
    console.log("Analyzing call transcript with", items.length, "items");
    
    // Filter to only include message items
    const messageItems = items.filter(item => item.type === "message");
    console.log("Filtered to", messageItems.length, "message items");
    
    if (messageItems.length === 0) {
      return "No message content found in the transcript to analyze.";
    }
    
    // Format transcript as text for analysis
    const transcriptText = messageItems.map(msg => {
      const role = msg.role === "user" ? "Caller" : msg.role === "tool" ? "Tool" : "Assistant";
      const content = msg.content ? msg.content.map(c => c.text || "").join("") : "";
      return `${role}: ${content}`;
    }).join("\n\n");
    
    console.log("Transcript text length:", transcriptText.length);
    
    // Call the API endpoint
    const response = await fetch('/api/analyze-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        items: messageItems,
        transcriptText: transcriptText 
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Analysis received, length:", data.analysis?.length || 0);
    return data.analysis || "No analysis available";
  } catch (error) {
    console.error("Error analyzing call transcript:", error);
    return "Error analyzing call transcript. Please try again later.";
  }
}

/**
 * Generates and downloads call analysis as text
 */
export async function generateAndDownloadCallAnalysisText(items: Item[]): Promise<void> {
  try {
    // Show loading indicator
    const loadingElement = document.createElement("div");
    loadingElement.style.position = "fixed";
    loadingElement.style.top = "0";
    loadingElement.style.left = "0";
    loadingElement.style.width = "100%";
    loadingElement.style.height = "100%";
    loadingElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    loadingElement.style.display = "flex";
    loadingElement.style.justifyContent = "center";
    loadingElement.style.alignItems = "center";
    loadingElement.style.zIndex = "9999";
    loadingElement.innerHTML = `
      <div style="background-color: white; padding: 20px; border-radius: 5px; text-align: center;">
        <p>Analyzing call transcript...</p>
        <p>This may take a moment.</p>
      </div>
    `;
    document.body.appendChild(loadingElement);

    try {
      // Get analysis
      const analysis = await analyzeCallTranscript(items);
      
      // Create a blob and download it
      const blob = new Blob([analysis], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `call-analysis-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("Analysis text downloaded successfully");
    } finally {
      // Remove loading indicator
      document.body.removeChild(loadingElement);
    }
  } catch (error) {
    console.error("Error generating call analysis:", error);
    alert("Error generating call analysis. Please try again later.");
  }
}
