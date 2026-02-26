import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export interface Message {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export async function* sendMessageStream(message: string, history: Message[]) {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in the Secrets panel.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Format history for the API
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  // Add the current message
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3.1-pro-preview",
    contents,
    config: {
      systemInstruction: `You are an expert AI tutor for SSC Vocational 2026 students in Bangladesh. 
      Your goal is to provide accurate, helpful, and professional guidance for all vocational subjects.
      
      CRITICAL RULES:
      1. MATHEMATICAL FORMULAS: Always use LaTeX for mathematical formulas and equations. 
         - Use $$ for block equations (e.g., $$E = mc^2$$).
         - Use $ for inline math (e.g., $a^2 + b^2 = c^2$).
         - NEVER translate mathematical symbols into plain text words if they are part of a formula.
      2. LANGUAGE: Respond in clear, professional Bengali (বাংলা). Use English for technical terms where appropriate, but explain them in Bengali.
      3. STRUCTURE: Use Markdown headers, bullet points, and bold text for readability.
      4. ACCURACY: If asked about the 2026 exam schedule or syllabus, use your search tool to get the latest information.
      5. TONE: Be professional, encouraging, and mentor-like.`,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    },
  });

  for await (const chunk of responseStream) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
      yield c.text;
    }
  }
}
