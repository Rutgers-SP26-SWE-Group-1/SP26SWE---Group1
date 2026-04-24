import { NextResponse } from 'next/server';
import {
  createConversationId,
  sanitizeMessages,
  validateChatRequest,
} from '@/lib/chat-logic';
// Multi-LLM fan-out endpoint: takes one prompt + a list of locally installed
// Ollama model ids and returns one response per model. Imports nothing from
// the cloud-routed /api/chat handler so we can never accidentally bill Gemini,
// Groq, or Anthropic from this path.
import { runFanout, summarizeFanout } from '@/lib/multi-llm/fanout';
import { isLocalModelId, listLocalModelIds } from '@/lib/multi-llm/localModels';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const SCARLET_MULTI_SYSTEM_PROMPT = `
You are one of several local language models answering the same Rutgers
student question in parallel. Keep answers focused and self-contained so a
side-by-side comparison is useful. If a question is ambiguous, ask one short
clarifying question before guessing. Do not invent Rutgers policies, bus
routes, or office hours.
`.trim();

function normalizeRequestedIds(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of rawIds) {
    if (typeof value !== 'string') continue;
    if (!isLocalModelId(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch (_err) {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const validation = validateChatRequest(body?.message);
  if (!validation.isValid || !validation.normalizedMessage) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const requestedIds = normalizeRequestedIds(body?.modelIds);
  if (requestedIds.length === 0) {
    return NextResponse.json(
      {
        error:
          'Pick at least one local model. Available: ' +
          listLocalModelIds().join(', '),
      },
      { status: 400 },
    );
  }

  const history = sanitizeMessages(
    Array.isArray(body?.messages) ? (body!.messages as unknown[]) : [],
  );

  const promptMessages: ChatMessage[] = [
    { role: 'system', content: SCARLET_MULTI_SYSTEM_PROMPT },
    ...history.map((m: { role: string; content: string }): ChatMessage => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: validation.normalizedMessage },
  ];

  const startedAt = Date.now();
  let responses;
  try {
    responses = await runFanout({
      modelIds: requestedIds,
      promptMessages,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fan-out failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const conversationId = createConversationId(
    typeof body?.conversationId === 'string' ? body.conversationId : '',
  );

  return NextResponse.json({
    conversationId,
    responses,
    summary: summarizeFanout(responses),
    totalDurationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
