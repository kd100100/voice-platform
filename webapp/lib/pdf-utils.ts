import { jsPDF } from "jspdf";
import type { Item } from "@/components/types";
// Import jspdf-autotable for better table support
import "jspdf-autotable";

/**
 * Generates a PDF from transcript items and triggers a download
 */
export async function generateAndDownloadTranscriptPdf(items: Item[]): Promise<void> {
  try {
    console.log("Generating PDF for transcript with", items.length, "items");
    
    // Filter items to only include messages, function calls, and function call outputs
    const transcriptItems = items.filter(
      (it) =>
        it.type === "message" ||
        it.type === "function_call" ||
        it.type === "function_call_output"
    );
    
    console.log("Filtered to", transcriptItems.length, "transcript items");

    // Create a new PDF document with Unicode support
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    // Add title
    doc.setFontSize(18);
    doc.text("Call Transcript", 105, 15, { align: "center" });
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 25, { align: "center" });
    
    // Add content
    doc.setFontSize(10);
    let y = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const textWidth = pageWidth - 2 * margin;
    
    // Add a note about language support
    doc.setFont("helvetica", "italic");
    doc.text("Note: This transcript supports multiple languages including Hindi.", margin, y);
    y += 10;
    
    for (const item of transcriptItems) {
      // Check if we need a new page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      // Get role and timestamp
      const role = item.role || "unknown";
      const timestamp = item.timestamp || "";
      
      // Get content text
      const contentText = item.content
        ? item.content.map((c) => c.text).join("")
        : "";
      
      // Add role and timestamp
      doc.setFont("helvetica", "bold");
      doc.text(`${getRoleName(role)} (${timestamp})`, margin, y);
      y += 6;
      
      // Add content with word wrapping
      doc.setFont("helvetica", "normal");
      
      // Check if content contains non-English characters
      const hasNonEnglishChars = contentText.split('').some(char => char.charCodeAt(0) > 127);
      
      if (hasNonEnglishChars) {
        console.log("Detected non-English content");
        // For non-English content, use a smaller font size and more spacing
        doc.setFontSize(9);
        const splitText = doc.splitTextToSize(contentText, textWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 6 + 10; // More spacing for non-English text
        doc.setFontSize(10); // Reset font size
      } else {
        const splitText = doc.splitTextToSize(contentText, textWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 5 + 10;
      }
    }
    
    // Save the PDF
    const filename = `call-transcript-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    console.log("PDF generated and saved as", filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("There was an error generating the PDF. Please try again.");
  }
}

/**
 * Gets a human-readable name for a role
 */
function getRoleName(role: string): string {
  switch (role) {
    case "user":
      return "Caller";
    case "assistant":
      return "Assistant";
    case "tool":
      return "Tool Response";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

/**
 * Generates a PDF with call analysis and downloads it
 */
export async function generateAndDownloadAnalysisPdf(analysis: string): Promise<void> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    // Add title with styling
    doc.setFillColor(41, 98, 255); // Primary blue color
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 25, 'F');
    
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(18);
    doc.text("Interview Analysis Report", 105, 15, { align: "center" });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 35, { align: "center" });
    
    // Add content
    doc.setFontSize(10);
    let y = 45;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const textWidth = pageWidth - 2 * margin;
    
    // Process the analysis to add formatting
    const sections = analysis.split(/^([A-Z][A-Z\s]+[A-Z]|\w+:)$/gm);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      
      if (!section) continue;
      
      // Check if we need a new page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      // If this is a heading (all caps or ends with colon)
      if (/^([A-Z][A-Z\s]+[A-Z]|\w+:)$/.test(section)) {
        // Add some space before headings (except the first one)
        if (y > 45) y += 5;
        
        doc.setFillColor(240, 240, 240); // Light gray background
        doc.rect(margin - 2, y - 4, textWidth + 4, 8, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(section, margin, y);
        y += 10;
        
        // Reset font
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      } else {
        // This is content text
        // Process bullet points
        const lines = section.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Check if we need a new page
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          // Check if this is a bullet point
          if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
            const bulletText = line.trim().substring(1).trim();
            const splitText = doc.splitTextToSize(bulletText, textWidth - 5);
            
            // Add bullet
            doc.text('•', margin, y);
            
            // Add indented text
            doc.text(splitText, margin + 5, y);
            y += splitText.length * 5 + 2;
          } else {
            const splitText = doc.splitTextToSize(line, textWidth);
            doc.text(splitText, margin, y);
            y += splitText.length * 5 + 2;
          }
        }
        
        // Add some space after content
        y += 3;
      }
    }
    
    // Save the PDF
    const filename = `interview-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    console.log("Analysis PDF generated and saved as", filename);
  } catch (error) {
    console.error("Error generating analysis PDF:", error);
    alert("There was an error generating the analysis PDF. Please try again.");
  }
}
