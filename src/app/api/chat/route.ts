import { NextResponse } from 'next/server';
import {
  createConversationId,
  sanitizeMessages,
  validateChatRequest,
} from '@/lib/chat-logic';
import { getChatModelOption } from '@/lib/chat-models';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const RUTGERS_SYSTEM_PROMPT = `
You are Scarlet AI, a helpful assistant for Rutgers University students.

Your top priority is answering Rutgers-related questions clearly, accurately, and practically. Focus on topics such as:
- Rutgers academics, majors, classes, studying, and student success
- campus life, student resources, clubs, events, and university services
- software engineering concepts when asked in a Rutgers course or student context
- general student guidance tailored to Rutgers University when relevant

Behavior rules:
- Prefer Rutgers-specific answers when the question is about university life or student needs.
- If the user asks a general question, answer normally, but keep a helpful student-facing tone.
- If the question is ambiguous, ask a short clarifying question before assuming details.
- Do not invent Rutgers policies, deadlines, locations, or contact information if you are unsure.
- Do not invent Rutgers bus route names, shuttle names, schedules, offices, or campus procedures.
- Be concise first, then add detail if needed.
- When helpful, suggest practical next steps a Rutgers student can take.

Tone:
- supportive, clear, and professional
- student-friendly, not robotic
- direct and easy to understand
`.trim();

function buildRutgersGroundingContext(message: string) {
  const normalized = message.toLowerCase();
  const isTransitQuestion =
    normalized.includes('rutgers bus') ||
    normalized.includes('bus route') ||
    normalized.includes('bus routes') ||
    normalized.includes('shuttle') ||
    normalized.includes('passio') ||
    normalized.includes('dots') ||
    normalized.includes('new brunswick bus') ||
    normalized.includes('newark bus') ||
    normalized.includes('camden bus');

  if (!isTransitQuestion) {
    return null;
  }

  return `
Official Rutgers transit grounding:

- Rutgers bus information should be treated as campus-specific and may change.
- For live routing, availability, and schedules, students should verify in Passio GO and with Rutgers DOTS.
- Rutgers does not provide direct intercampus bus service between New Brunswick, Newark, and Camden.

Known official campus transit names:
- New Brunswick/Piscataway weekday routes include: A, B, BL Loop, C, EE, F, H, LX, REXB, and REXL.
- New Brunswick also operates Knight Mover and a shuttle to 33 Knightsbridge Road.
- Newark campus transit includes Campus Connect. Newark service pages also reference Penn Station and Penn Station Local.
- Camden campus transit is the Rutgers Camden Shuttle.

Answering rules for transit questions:
- Use only the route names above if naming Rutgers buses.
- If the user asks for current timing, delays, or stop-by-stop directions, say they should verify in Passio GO or Rutgers DOTS because those details change.
- If you are not fully sure which campus the user means, ask whether they mean New Brunswick, Newark, or Camden.
  `.trim();
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

    const groundingContext = buildRutgersGroundingContext(validation.normalizedMessage);

    const promptMessages: ChatMessage[] = [
      { role: 'system', content: RUTGERS_SYSTEM_PROMPT },
      ...(groundingContext ? [{ role: 'system' as const, content: groundingContext }] : []),
      ...chatHistory,
    ];

    // Append the current message
    promptMessages.push({ role: 'user', content: validation.normalizedMessage });

    let content = '';
    const startTime = Date.now();

    content = await requestOllama(promptMessages, selectedModel.ollamaModel!);

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
