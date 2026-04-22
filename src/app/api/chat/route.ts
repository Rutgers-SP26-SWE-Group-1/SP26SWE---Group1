import { NextResponse } from 'next/server';
import {
  createConversationId,
  detectMathReasoningRequest,
  detectRutgersCourseWeatherRequest,
  resolveChatModelId,
  sanitizeMessages,
  validateChatRequest,
} from '@/lib/chat-logic';
import { getChatModelOption } from '@/lib/chat-models';
import { handleRutgersCourseWeatherRequest } from '@/lib/rutgers-course-weather';

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

const STEP_BY_STEP_REASONING_PROMPT = `
You are Scarlet AI in Step-by-Step Mode, acting as a careful math tutor.

Rules:
- Solve the student's math problem clearly and educationally.
- Do not reveal hidden chain-of-thought or private reasoning.
- Provide only a concise teaching explanation.
- Always respond using exactly these headings in this exact order:

Understanding:
<short description of the problem>

Step 1:
<first step>

Step 2:
<second step>

Step 3:
<third step>

Final Answer:
<final result>

- Keep each section short and student-friendly.
- Even for simple problems, include all sections and use Step 3 for checking or concluding the result.
`.trim();

const STEP_BY_STEP_SECTIONS = [
  'Understanding',
  'Step 1',
  'Step 2',
  'Step 3',
  'Final Answer',
] as const;

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLabeledSection(content: string, label: string) {
  const labelsPattern = STEP_BY_STEP_SECTIONS.map(escapeRegExp).join('|');
  const regex = new RegExp(
    `${escapeRegExp(label)}:\\s*([\\s\\S]*?)(?=\\n(?:${labelsPattern}):|$)`,
    'i'
  );
  const match = content.match(regex);
  return match?.[1]?.trim() ?? '';
}

function splitIntoTeachingChunks(content: string) {
  return content
    .split(/\n\s*\n|(?<=\.)\s+(?=[A-Z])|(?<=\d)\.\s+/)
    .map((segment) => segment.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function formatStepByStepResponse(content: string, question: string) {
  const understanding = extractLabeledSection(content, 'Understanding');
  const step1 = extractLabeledSection(content, 'Step 1');
  const step2 = extractLabeledSection(content, 'Step 2');
  const step3 = extractLabeledSection(content, 'Step 3');
  const finalAnswer = extractLabeledSection(content, 'Final Answer');

  const hasAllSections =
    understanding && step1 && step2 && step3 && finalAnswer;

  if (hasAllSections) {
    return [
      'Understanding:',
      understanding,
      '',
      'Step 1:',
      step1,
      '',
      'Step 2:',
      step2,
      '',
      'Step 3:',
      step3,
      '',
      'Final Answer:',
      finalAnswer,
    ].join('\n');
  }

  const segments = splitIntoTeachingChunks(content);
  const fallbackUnderstanding =
    understanding || `We need to solve: ${question.trim()}`;
  const fallbackStep1 = step1 || segments[0] || 'Identify the quantities, symbols, and goal of the problem.';
  const fallbackStep2 = step2 || segments[1] || 'Apply the correct math rule or operation carefully.';
  const fallbackStep3 = step3 || segments[2] || 'Check the result and make sure it answers the original question.';
  const fallbackFinalAnswer =
    finalAnswer || segments[segments.length - 1] || 'The solution is shown above.';

  return [
    'Understanding:',
    fallbackUnderstanding,
    '',
    'Step 1:',
    fallbackStep1,
    '',
    'Step 2:',
    fallbackStep2,
    '',
    'Step 3:',
    fallbackStep3,
    '',
    'Final Answer:',
    fallbackFinalAnswer,
  ].join('\n');
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
  } catch {
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

    const stepByStepMode = body?.stepByStepMode === true;
    const isMathRequest = detectMathReasoningRequest(
      validation.normalizedMessage,
      stepByStepMode
    );
    const rutgersLiveRequest = detectRutgersCourseWeatherRequest(
      validation.normalizedMessage
    );
    const resolvedModelId = resolveChatModelId(body?.modelId, {
      stepByStepMode,
      isMathRequest,
    });
    const selectedModel = getChatModelOption(resolvedModelId);
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
      ...(isMathRequest ? [{ role: 'system' as const, content: STEP_BY_STEP_REASONING_PROMPT }] : []),
      ...chatHistory,
    ];

    // Append the current message
    promptMessages.push({ role: 'user', content: validation.normalizedMessage });

    let content = '';
    const startTime = Date.now();

    if (rutgersLiveRequest.needsAny) {
      const toolResponse = await handleRutgersCourseWeatherRequest(
        validation.normalizedMessage
      );
      content = toolResponse.formatted;
    } else {
      // Local Ollama Models [cite: 13, 14]
      content = await requestOllama(promptMessages, selectedModel.ollamaModel!);

      if (isMathRequest) {
        content = formatStepByStepResponse(content, validation.normalizedMessage);
      }
    }

    const conversationId = createConversationId(body?.conversationId);

    return NextResponse.json({
      conversationId,
      content: content.trim(),
      durationMs: Date.now() - startTime,
      modelId: selectedModel.id,
      modelLabel: selectedModel.label,
      modelDescription: selectedModel.details,
      stepByStepMode: isMathRequest,
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to process your message.';
    console.error('POST /api/chat failed:', error);
    return NextResponse.json(
      { error: message },
      { status: 503 }
    );
  }
}
