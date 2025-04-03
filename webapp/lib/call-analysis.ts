import { jsPDF } from "jspdf";
import type { Item } from "@/components/types";

/**
 * Analyzes a call transcript using OpenAI's GPT-4o model via API
 * @param items Transcript items to analyze
 * @returns Analysis result as a string
 */
export async function analyzeCallTranscript(items: Item[]): Promise<string> {
  try {
    // Call the API endpoint
    const response = await fetch('/api/analyze-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.analysis || "No analysis available";
  } catch (error) {
    console.error("Error analyzing call transcript:", error);
    return "Error analyzing call transcript. Please try again later.";
  }
}

/**
 * Generates a PDF with call analysis and downloads it
 */
export async function generateAndDownloadCallAnalysisPdf(items: Item[]): Promise<void> {
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

    // Get analysis
    const analysis = await analyzeCallTranscript(items);

    // Create PDF
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Call Analysis Report", 105, 15, { align: "center" });
    
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
    const filename = `call-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    // Remove loading indicator
    document.body.removeChild(loadingElement);
  } catch (error) {
    console.error("Error generating call analysis PDF:", error);
    alert("Error generating call analysis PDF. Please try again later.");
  }
}
