import { NextResponse } from 'next/server';
import {
  createConversationId,
  sanitizeMessages,
  validateChatRequest,
} from '@/lib/chat-logic';
import { getChatModelOption } from '@/lib/chat-models';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * PRODUCER: Google Gemini (Universal Cloud)
 */
async function requestGemini(messages: ChatMessage[], apiKey: string) {
  // UPDATED: Using gemini-2.5-flash on the stable v1 endpoint
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * PRODUCER: Groq (Universal Cloud Llama)
 */
async function requestGroq(messages: ChatMessage[], apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * PRODUCER: Local Ollama (Local Development)
 */
async function requestOllama(messages: ChatMessage[], model: string) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama model "${model}" not found or service error.`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (err) {
    throw new Error(`Ollama is unavailable. Make sure "ollama serve" is running.`);
  }
}

/**
 * MAIN POST HANDLER
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateChatRequest(body?.message);

    if (!validation.isValid || !validation.normalizedMessage) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const selectedModel = getChatModelOption(body?.modelId);
    const messages = sanitizeMessages(body?.messages ?? []);
    
    // Ensure history is sent to the LLM for context memory [cite: 10, 35]
    const chatHistory: ChatMessage[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    // Append the current message
    chatHistory.push({ role: 'user', content: validation.normalizedMessage });

    let content = '';
    const startTime = Date.now();

    // ROUTING LOGIC
    if (selectedModel.provider === 'google') {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("Google API Key missing in environment.");
      content = await requestGemini(chatHistory, apiKey);
    } 
    else if (selectedModel.provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API Key missing in environment.");
      content = await requestGroq(chatHistory, apiKey);
    } 
    else {
      // Local Ollama Models [cite: 13, 14]
      content = await requestOllama(chatHistory, selectedModel.ollamaModel!);
    }

    const conversationId = createConversationId(body?.conversationId);

    return NextResponse.json({
      conversationId,
      content: content.trim(),
      durationMs: Date.now() - startTime,
      modelId: selectedModel.id,
      modelLabel: selectedModel.label,
      modelDescription: selectedModel.details,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('POST /api/chat failed:', error);
    return NextResponse.json(
      { error: error.message || 'Unable to process your message.' },
      { status: 503 }
    );
  }
}