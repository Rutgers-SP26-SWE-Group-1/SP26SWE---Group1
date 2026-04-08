import { NextResponse } from 'next/server';
import {
  buildFallbackReply,
  buildProviderPayload,
  createConversationId,
  isSimplePrompt,
  sanitizeMessages,
  validateChatRequest,
} from '@/lib/chat-logic';
import { getChatModelOption } from '@/lib/chat-models';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  message?: string;
  conversationId?: string;
  messages?: ChatMessage[];
  modelId?: string;
  userName?: string;
};

type ProviderResult = {
  content: string;
  durationMs: number;
  modelId: string;
  modelLabel: string;
  modelDescription: string;
};

function coerceChatMessages(messages: ReturnType<typeof sanitizeMessages>): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  }));
}

async function requestOllama(
  messages: ChatMessage[],
  modelId?: string,
  options?: { simplePromptMode?: boolean }
): Promise<ProviderResult | null> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const selectedModel = getChatModelOption(modelId);
  const model = selectedModel.ollamaModel;
  const startTime = Date.now();
  const simplePromptMode = Boolean(options?.simplePromptMode);

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
        keep_alive: '10m',
        options: simplePromptMode
          ? {
              num_predict: 48,
              temperature: 0.2,
            }
          : {
              temperature: 0.7,
            },
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
    durationMs: Date.now() - startTime,
    modelId: selectedModel.id,
    modelLabel: selectedModel.label,
    modelDescription: selectedModel.description,
  };
}

async function generateAssistantReply(
  message: string,
  messages: ChatMessage[],
  modelId?: string,
  userName?: string
): Promise<ProviderResult> {
  const simplePromptMode = isSimplePrompt(message);
  const payload = buildProviderPayload(messages, message, {
    userName,
    simplePromptMode,
  }) as {
    messages: ChatMessage[];
    userName: string | null;
    simplePromptMode?: boolean;
  };
  const selectedModel = getChatModelOption(modelId);

  try {
    return (
      (await requestOllama(payload.messages, selectedModel.id, {
        simplePromptMode: payload.simplePromptMode,
      })) || {
        content: buildFallbackReply(message, { userName }),
        durationMs: 0,
        modelId: selectedModel.id,
        modelLabel: selectedModel.label,
        modelDescription: `${selectedModel.description} fallback`,
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
      body?.modelId,
      body?.userName
    );

    return NextResponse.json({
      conversationId,
      content: assistantReply.content,
      durationMs: assistantReply.durationMs,
      modelId: assistantReply.modelId,
      modelLabel: assistantReply.modelLabel,
      modelDescription: assistantReply.modelDescription,
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
