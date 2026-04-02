import { NextResponse } from 'next/server';
import {
  buildFallbackReply,
  buildProviderPayload,
  createConversationId,
  sanitizeMessages,
  validateChatRequest,
} from '@/lib/chat-logic';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  message?: string;
  conversationId?: string;
  messages?: ChatMessage[];
  userName?: string;
};

type ProviderResult = {
  content: string;
  provider: 'ollama' | 'openai' | 'gemini' | 'fallback';
};

function coerceChatMessages(messages: ReturnType<typeof sanitizeMessages>): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  }));
}

async function requestOpenAI(messages: ChatMessage[]): Promise<ProviderResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty response.');
  }

  return {
    content: content.trim(),
    provider: 'openai',
  };
}

async function requestGemini(messages: ChatMessage[]): Promise<ProviderResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${
      process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    }:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();

  if (!content) {
    throw new Error('Gemini returned an empty response.');
  }

  return {
    content,
    provider: 'gemini',
  };
}

async function requestOllama(messages: ChatMessage[]): Promise<ProviderResult | null> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL || 'gemma3:4b';

  let response: Response;

  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });
  } catch {
    throw new Error(
      `Ollama is unavailable at ${baseUrl}. Start it with "ollama serve" and make sure the model "${model}" is installed.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Ollama request failed with status ${response.status}. Make sure the model "${model}" exists locally.`
    );
  }

  const data = await response.json();
  const content = data?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Ollama returned an empty response.');
  }

  return {
    content: content.trim(),
    provider: 'ollama',
  };
}

function getProviderPreference() {
  return (process.env.AI_PROVIDER || 'ollama').toLowerCase();
}

async function generateAssistantReply(
  message: string,
  messages: ChatMessage[],
  userName?: string
): Promise<ProviderResult> {
  const payload = buildProviderPayload(messages, message, { userName }) as {
    messages: ChatMessage[];
    userName: string | null;
  };
  const providerPreference = getProviderPreference();

  if (providerPreference === 'fallback') {
    return {
      content: buildFallbackReply(message, { userName }),
      provider: 'fallback',
    };
  }

  try {
    if (providerPreference === 'ollama') {
      return (
        (await requestOllama(payload.messages)) || {
          content: buildFallbackReply(message, { userName }),
          provider: 'fallback',
        }
      );
    }

    if (providerPreference === 'openai') {
      return (
        (await requestOpenAI(payload.messages)) || {
          content: buildFallbackReply(message, { userName }),
          provider: 'fallback',
        }
      );
    }

    if (providerPreference === 'gemini') {
      return (
        (await requestGemini(payload.messages)) || {
          content: buildFallbackReply(message, { userName }),
          provider: 'fallback',
        }
      );
    }

    return (
      (await requestOllama(payload.messages)) ||
      (await requestOpenAI(payload.messages)) ||
      (await requestGemini(payload.messages)) || {
        content: buildFallbackReply(message, { userName }),
        provider: 'fallback',
      }
    );
  } catch (error) {
    console.error('Chat provider error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const validation = validateChatRequest(body?.message);

    if (!validation.isValid || !validation.normalizedMessage) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const messages = coerceChatMessages(sanitizeMessages(body?.messages ?? []));
    const conversationId = createConversationId(body?.conversationId);
    const assistantReply = await generateAssistantReply(
      validation.normalizedMessage,
      messages,
      body?.userName
    );

    return NextResponse.json({
      conversationId,
      content: assistantReply.content,
      provider: assistantReply.provider,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/chat failed:', error);

    const message =
      error instanceof Error ? error.message : 'Unable to process your message right now.';

    return NextResponse.json(
      { error: message },
      { status: 503 }
    );
  }
}
