import { jsPDF } from "jspdf";
import type { Item } from "@/components/types";

/**
 * Generates a PDF from transcript items and triggers a download
 */
export async function generateAndDownloadTranscriptPdf(items: Item[]): Promise<void> {
  // Filter items to only include messages, function calls, and function call outputs
  const transcriptItems = items.filter(
    (it) =>
      it.type === "message" ||
      it.type === "function_call" ||
      it.type === "function_call_output"
  );

  // Create a new PDF document
  const doc = new jsPDF();
  
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
    const splitText = doc.splitTextToSize(contentText, textWidth);
    doc.text(splitText, margin, y);
    
    // Move y position for next item
    y += splitText.length * 5 + 10;
  }
  
  // Save the PDF
  const filename = `call-transcript-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
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
