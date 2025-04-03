import { Item } from "@/components/types";

// Phrases that indicate the call should end
const END_CALL_PHRASES = [
  "goodbye",
  "thank you for calling",
  "call has ended",
  "end of call",
  "is there anything else i can help you with",
  "have a great day",
  "have a nice day",
  "thank you for your time",
  "thanks for calling",
  "call is now complete",
  "this concludes our call"
];

export default async function handleRealtimeEvent(
  ev: any,
  setItems: React.Dispatch<React.SetStateAction<Item[]>>,
  setCallStatus?: React.Dispatch<React.SetStateAction<string>>
) {
  // Helper function to create a new item with default fields
  function createNewItem(base: Partial<Item>): Item {
    return {
      object: "realtime.item",
      timestamp: new Date().toLocaleTimeString(),
      ...base,
    } as Item;
  }

  // Helper function to update an existing item if found by id, or add a new one if not.
  // We can also pass partial updates to reduce repetitive code.
  function updateOrAddItem(id: string, updates: Partial<Item>): void {
    setItems((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...updates };
        return updated;
      } else {
        return [...prev, createNewItem({ id, ...updates })];
      }
    });
  }

  const { type } = ev;

  switch (type) {
    case "session.created": {
      // Starting a new session, clear all items
      setItems([]);
      break;
    }

    case "input_audio_buffer.speech_started": {
      // Create a user message item with running status and placeholder content
      const { item_id } = ev;
      setItems((prev) => [
        ...prev,
        createNewItem({
          id: item_id,
          type: "message",
          role: "user",
          content: [{ type: "text", text: "..." }],
          status: "running",
        }),
      ]);
      break;
    }

    case "conversation.item.created": {
      const { item } = ev;
      if (item.type === "message") {
        // A completed message from user or assistant
        const updatedContent =
          item.content && item.content.length > 0 ? item.content : [];
        
        // Check if this is an assistant message that indicates the call should end
        if (item.role === "assistant" && updatedContent.length > 0) {
          const messageText = updatedContent.map((c: { type: string; text: string }) => c.text).join("").toLowerCase();
          
          // Check if the message contains any end call phrases
          const shouldEndCall = END_CALL_PHRASES.some(phrase => 
            messageText.includes(phrase.toLowerCase())
          );
          
          if (shouldEndCall && setCallStatus) {
            console.log("Detected end of call phrase in assistant message");
            // Set a timeout to end the call after a short delay
            setTimeout(() => {
              console.log("Auto-ending call based on assistant response");
              setCallStatus("ended");
            }, 3000); // 3 second delay to allow the message to be heard
          }
        }
        
        setItems((prev) => {
          const idx = prev.findIndex((m) => m.id === item.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              ...item,
              content: updatedContent,
              status: "completed",
              timestamp:
                updated[idx].timestamp || new Date().toLocaleTimeString(),
            };
            return updated;
          } else {
            return [
              ...prev,
              createNewItem({
                ...item,
                content: updatedContent,
                status: "completed",
              }),
            ];
          }
        });
      }
      // NOTE: We no longer handle function_call items here.
      // The handling of function_call items has been moved to the "response.output_item.done" event.
      else if (item.type === "function_call_output") {
        // Function call output item created
        // Add the output item and mark the corresponding function_call as completed
        // Also display in transcript as tool message with the response
        setItems((prev) => {
          const newItems = [
            ...prev,
            createNewItem({
              ...item,
              role: "tool",
              content: [
                {
                  type: "text",
                  text: `Function call response: ${item.output}`,
                },
              ],
              status: "completed",
            }),
          ];

          return newItems.map((m) =>
            m.call_id === item.call_id && m.type === "function_call"
              ? { ...m, status: "completed" }
              : m
          );
        });
      }
      break;
    }

    case "conversation.item.input_audio_transcription.completed": {
      // Update the user message with the final transcript
      const { item_id, transcript, audio_url } = ev;
      
      // Log the transcript for debugging
      console.log("Received transcript:", transcript);
      
      // Check if transcript contains non-English characters
      const hasNonEnglishChars = transcript.split('').some((char: string) => char.charCodeAt(0) > 127);
      const hasDevanagariChars = /[\u0900-\u097F]/.test(transcript);
      
      if (hasNonEnglishChars || hasDevanagariChars) {
        console.log("Non-English transcript detected", hasDevanagariChars ? "(Hindi)" : "");
        
        // If we have an audio URL and it seems to be Hindi, try to use our custom transcription API
        if (audio_url) {
          try {
            console.log("Attempting to use custom transcription API for Hindi speech");
            
            // Fetch the audio file
            const audioResponse = await fetch(audio_url);
            const audioBlob = await audioResponse.blob();
            
            // Create a FormData object to send to our API
            const formData = new FormData();
            formData.append("audio", audioBlob, "speech.webm");
            
            // Call our transcription API
            const response = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.transcription) {
                console.log("Custom transcription successful:", data.transcription);
                
                // Update the transcript with the new transcription
                setItems((prev) =>
                  prev.map((m) =>
                    m.id === item_id && m.type === "message" && m.role === "user"
                      ? {
                          ...m,
                          content: [{ type: "text", text: data.transcription }],
                          status: "completed",
                        }
                      : m
                  )
                );
                break;
              }
            } else {
              console.error("Custom transcription failed:", await response.text());
            }
          } catch (error) {
            console.error("Error using custom transcription API:", error);
          }
        }
      }
      
      // Fall back to the original transcript if custom transcription failed or wasn't attempted
      setItems((prev) =>
        prev.map((m) =>
          m.id === item_id && m.type === "message" && m.role === "user"
            ? {
                ...m,
                content: [{ type: "text", text: transcript }],
                status: "completed",
              }
            : m
        )
      );
      break;
    }

    case "response.content_part.added": {
      const { item_id, part, output_index } = ev;
      // Append new content to the assistant message if output_index == 0
      if (part.type === "text" && output_index === 0) {
        setItems((prev) => {
          const idx = prev.findIndex((m) => m.id === item_id);
          if (idx >= 0) {
            const updated = [...prev];
            const existingContent = updated[idx].content || [];
            updated[idx] = {
              ...updated[idx],
              content: [
                ...existingContent,
                { type: part.type, text: part.text },
              ],
            };
            return updated;
          } else {
            // If the item doesn't exist yet, create it as a running assistant message
            return [
              ...prev,
              createNewItem({
                id: item_id,
                type: "message",
                role: "assistant",
                content: [{ type: part.type, text: part.text }],
                status: "running",
              }),
            ];
          }
        });
      }
      break;
    }

    case "response.audio_transcript.delta": {
      // Streaming transcript text (assistant)
      const { item_id, delta, output_index } = ev;
      if (output_index === 0 && delta) {
        setItems((prev) => {
          const idx = prev.findIndex((m) => m.id === item_id);
          if (idx >= 0) {
            const updated = [...prev];
            const existingContent = updated[idx].content || [];
            updated[idx] = {
              ...updated[idx],
              content: [...existingContent, { type: "text", text: delta }],
            };
            return updated;
          } else {
            return [
              ...prev,
              createNewItem({
                id: item_id,
                type: "message",
                role: "assistant",
                content: [{ type: "text", text: delta }],
                status: "running",
              }),
            ];
          }
        });
      }
      break;
    }

    case "response.output_item.done": {
      const { item } = ev;
      if (item.type === "function_call") {
        // A new function call item
        // Display it in the transcript as an assistant message indicating a function is being requested
        console.log("function_call", item);
        setItems((prev) => [
          ...prev,
          createNewItem({
            ...item,
            role: "assistant",
            content: [
              {
                type: "text",
                text: `${item.name}(${JSON.stringify(
                  JSON.parse(item.arguments)
                )})`,
              },
            ],
            status: "running",
          }),
        ]);
      }
      break;
    }

    case "call.ended": {
      // Call has ended, update the call status
      console.log("Call ended event received");
      if (setCallStatus) {
        console.log("Setting call status to ended");
        setCallStatus("ended");
        
        // Log the current items for debugging
        setItems(prev => {
          console.log("Items at call end:", prev.length);
          return prev;
        });
      } else {
        console.log("setCallStatus is not defined");
      }
      break;
    }
    
    // Additional case to handle disconnection events that might not trigger call.ended
    case "session.disconnected":
    case "websocket.disconnected": {
      console.log(`${type} event received, ensuring call status is set to ended`);
      if (setCallStatus) {
        console.log("Setting call status to ended due to disconnection");
        setCallStatus("ended");
      }
      break;
    }

    default:
      break;
  }
}
