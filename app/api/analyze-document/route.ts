import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
function sanitizeAIResponse(text: string): string {
  let sanitized = text.trim()

  sanitized = sanitized.replace(/^\s*```(?:json)?\s*/i, "") 
  sanitized = sanitized.replace(/^\s*```\s*/g, "") 
  sanitized = sanitized.replace(/```\s*$/g, "") 
  
  if (
    sanitized.startsWith("`") &&
    sanitized.endsWith("`") &&
    sanitized.length > 2
  ) {
    sanitized = sanitized.slice(1, -1)
  }

  return sanitized.trim()
}

export async function POST(request: NextRequest) {
  try {
    const { documentText } = await request.json()

    if (!documentText) {
      return NextResponse.json({ error: "Document text is required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Analyze this document and identify all fillable fields that would typically need to be completed by a user. 

Document content:
${documentText}

Please identify fields such as:
- Names (first name, last name, full name)
- Addresses (street, city, state, zip)
- Contact information (phone, email)
- Dates (birth date, signature date, etc.)
- Numbers (SSN, ID numbers, amounts)
- Text fields (descriptions, comments)
- Checkboxes or selections

For each field found, provide a JSON response in this exact format:
{
  "fields": [
    {
      "name": "field_name",
      "type": "text|number|date|email|phone|address|checkbox",
      "description": "Brief description of what this field is for",
      "placeholder": "[[FIELD_NAME]]",
      "required": true|false
    }
  ]
}

Only return the JSON, no other text.`,
      system:
        "You are a document analysis expert. Analyze documents to identify fillable fields that users would need to complete. Return only valid JSON.",
    })
    const sanitized = sanitizeAIResponse(text)
console.log("AI RAW OUTPUT:", JSON.stringify(text))
console.log("AI SANITIZED:", JSON.stringify(sanitized))
return NextResponse.json({ analysis: sanitized })
    
  } catch (error) {
    console.error("Error analyzing document:", error)
    return NextResponse.json({ error: "Failed to analyze document" }, { status: 500 })
  }
}
