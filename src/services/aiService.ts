import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIConfig {
  provider: 'gemini' | 'ollama';
  ollamaUrl?: string;
  ollamaModel?: string;
  ollamaToken?: string;
}

let currentConfig: AIConfig = {
  provider: 'gemini'
};

export function updateAIConfig(config: AIConfig) {
  currentConfig = config;
}

export async function generateResponse(prompt: string, systemInstruction?: string) {
  if (currentConfig.provider === 'ollama') {
    return generateOllamaResponse(prompt, systemInstruction);
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Du bist der Orchestrator der Taktikal USB/WEB Suite. Du hilfst Benutzern bei der Hardware-Verwaltung, der Erstellung von Agenten und dem Bau von Tools. Antworte immer auf Deutsch.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Error generating response. Check connection.";
  }
}

async function generateOllamaResponse(prompt: string, systemInstruction?: string) {
  try {
    const url = currentConfig.ollamaUrl || "http://localhost:11434";
    const model = currentConfig.ollamaModel || "llama3";
    const token = currentConfig.ollamaToken;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        prompt: systemInstruction ? `${systemInstruction}\n\nUser: ${prompt}` : prompt,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Ollama Error:", error);
    return `Error connecting to Ollama at ${currentConfig.ollamaUrl}. Ensure Ollama is running and OLLAMA_ORIGINS="*" is set.`;
  }
}

export async function* generateResponseStream(prompt: string, systemInstruction?: string) {
  if (currentConfig.provider === 'ollama') {
    yield* generateOllamaResponseStream(prompt, systemInstruction);
    return;
  }

  try {
    const result = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Du bist der Orchestrator der Taktikal USB/WEB Suite. Antworte immer auf Deutsch.",
      },
    });

    for await (const chunk of result) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("AI Streaming Error:", error);
    yield "Error streaming response.";
  }
}

async function* generateOllamaResponseStream(prompt: string, systemInstruction?: string) {
  try {
    const url = currentConfig.ollamaUrl || "http://localhost:11434";
    const model = currentConfig.ollamaModel || "llama3";
    const token = currentConfig.ollamaToken;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        prompt: systemInstruction ? `${systemInstruction}\n\nUser: ${prompt}` : prompt,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) yield json.response;
        } catch (e) {
          console.warn("Failed to parse Ollama chunk", line);
        }
      }
    }
  } catch (error) {
    console.error("Ollama Streaming Error:", error);
    yield `Error connecting to Ollama at ${currentConfig.ollamaUrl}.`;
  }
}
