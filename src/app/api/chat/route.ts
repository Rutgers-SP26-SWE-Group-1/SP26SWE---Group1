import { NextResponse } from 'next/server';
import {
  createConversationId,
  detectMathReasoningRequest,
  resolveChatModelId,
  sanitizeMessages,
  validateChatRequest,
} from '@/lib/chat-logic';
import { CHAT_MODEL_OPTIONS, getChatModelOption, type ChatModelOption } from '@/lib/chat-models';
import { runDebateFollowUp, runDebateMode } from '@/lib/debateMode';
import { searchDuckDuckGo, type SearchResult } from '@/lib/duckDuckGoSearch';
import {
  answerLocalRutgersCourseQuestion,
  detectScheduleIntent,
  extractRutgersCourseCodes,
  extractRutgersTakenCourses,
  formatCourseContextForModel,
  formatVerifiedCourseFacts,
  getLocalRutgersCoursesForQuestion,
} from '@/lib/rutgers-course-weather';
import {
  detectSocTerm,
  fetchRutgersSocCourses,
  filterSocCourses,
  formatSocContext,
} from '@/lib/rutgersSocApi';

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
- Never state a date unless it comes from system time, explicit user input, or retrieved API data.
- Never generate Rutgers institutional classifications such as school, division, department, or campus ownership from model knowledge alone. Only use validated app-provided course metadata.
- Do not invent Rutgers bus route names, shuttle names, schedules, offices, or campus procedures.
- Be concise first, then add detail if needed.
- When helpful, suggest practical next steps a Rutgers student can take.

Tone:
- supportive, clear, and professional
- student-friendly, not robotic
- direct and easy to understand
`.trim();

const WEB_SEARCH_SYSTEM_PROMPT = `
You are Scarlet AI.

Use only the verified context below to answer.
If the context does not contain the answer, say:
“I could not verify that from the available sources.”

Formatting:
Use plain text.
No asterisks.
No bold.
No bullet points unless the user asks for a list.
Keep the answer concise and student-friendly.
`.trim();

const SOC_SYSTEM_PROMPT = `
You are Scarlet AI.

Use only the Rutgers Schedule of Classes context below.
Do not guess instructors, sections, times, locations, or open/closed status.
If the context does not contain the answer, say:
“I could not verify that from the available Rutgers Schedule of Classes data.”

Formatting:
Use plain text.
No asterisks.
No bold.
Keep the answer short and student-friendly.
`.trim();

const MODEL_STYLE_INSTRUCTIONS: Record<string, string> = {
  mistral: 'Be concise and practical.',
  'llama3.2': 'Give a balanced student-friendly explanation.',
  deepseek: 'Focus on reasoning and academic planning.',
  'qwen-coder': 'Focus on technical details and prerequisites.',
  gemma: 'Focus on beginner-friendly explanation.',
};

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

function stripMarkdownAsterisks(content: string) {
  return content.replace(/\*/g, '').trim();
}

function limitToFiveSentences(content: string) {
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return sentences.slice(0, 5).join(' ').replace(/\s+/g, ' ').trim();
}

function formatSearchResultsForPrompt(results: SearchResult[]) {
  return results
    .map((result, index) =>
      [
        `Result ${index + 1}`,
        `Title: ${result.title}`,
        `URL: ${result.url}`,
        `Snippet: ${result.snippet}`,
      ].join('\n')
    )
    .join('\n\n');
}

function formatSourcesUsed(results: SearchResult[]) {
  if (results.length === 0) {
    return '';
  }

  return [
    '',
    'Sources used:',
    ...results.map((result) => `${result.title} - ${result.url}`),
  ].join('\n');
}

function shouldUseDuckDuckGoSearch(message: string) {
  const normalized = message.toLowerCase();
  const isCasual =
    /^(hi|hello|hey|thanks|thank you)\b/.test(normalized) ||
    normalized.includes('how are you');
  const asksForCodingHelp =
    normalized.includes('code') ||
    normalized.includes('debug') ||
    normalized.includes('typescript') ||
    normalized.includes('javascript') ||
    normalized.includes('react');
  const asksCurrentOrFactual =
    normalized.includes('current') ||
    normalized.includes('latest') ||
    normalized.includes('today') ||
    normalized.includes('deadline') ||
    normalized.includes('policy') ||
    normalized.includes('professor') ||
    normalized.includes('instructor') ||
    normalized.includes('rutgers') ||
    normalized.includes('course details') ||
    normalized.includes('course fact') ||
    normalized.includes('when is') ||
    normalized.includes('what is the') ||
    normalized.includes('who is');

  return asksCurrentOrFactual && !isCasual && !asksForCodingHelp;
}

function detectRouteIntent(message: string): 'course_info' | 'schedule' | 'curriculum' | 'general' {
  const normalized = message.toLowerCase();

  if (detectScheduleIntent(message)) {
    return 'schedule';
  }

  if (
    normalized.includes('curriculum') ||
    normalized.includes('degree') ||
    normalized.includes('requirement') ||
    normalized.includes('requirements') ||
    normalized.includes('required courses') ||
    normalized.includes('need to take')
  ) {
    return 'curriculum';
  }

  if (extractRutgersCourseCodes(message).length > 0) {
    return 'course_info';
  }

  return 'general';
}

async function answerWithRutgersSoc(message: string, model: ChatModelOption) {
  const term = detectSocTerm(message);
  const allCourses = await fetchRutgersSocCourses(term, 'NB');
  const matchingCourses = filterSocCourses(allCourses, message);
  const context = formatSocContext(matchingCourses, term);

  if (!context) {
    return {
      content: 'I could not verify that from the available Rutgers Schedule of Classes data.',
      term,
    };
  }

  const answer = await requestOllama(
    [
      { role: 'system', content: SOC_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          `Rutgers Schedule of Classes context:\n${context}`,
          '',
          `Model style instruction:\n${getModelStyleInstruction(model.id)}`,
          '',
          `User question:\n${message}`,
        ].join('\n'),
      },
    ],
    model.ollamaModel!
  );

  return {
    content: limitToFiveSentences(stripMarkdownAsterisks(answer)),
    term,
  };
}

function getModelStyleInstruction(modelId: string) {
  return MODEL_STYLE_INSTRUCTIONS[modelId] ?? 'Give a clear student-friendly explanation.';
}

function detectMultiModelRequest(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('multi-model') ||
    normalized.includes('all models') ||
    normalized.includes('compare models') ||
    normalized.includes('each model')
  );
}

async function answerCourseWithModel(
  message: string,
  model: ChatModelOption,
  verifiedContext: string
) {
  const answer = await requestOllama(
    [
      {
        role: 'system',
        content: [
          'You are Scarlet AI.',
          'Use only the verified course data below.',
          'Do not change factual fields such as course code, title, school, credits, verified next courses, or sources.',
          'You may vary only explanation style, recommendation, difficulty interpretation, study advice, and who the course is best for.',
          'Use plain text. No asterisks. No bold. Maximum 5 sentences.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `Verified course data:\n${verifiedContext}`,
          '',
          `Model style instruction:\n${getModelStyleInstruction(model.id)}`,
          '',
          `User question:\n${message}`,
        ].join('\n'),
      },
    ],
    model.ollamaModel!
  );

  return limitToFiveSentences(stripMarkdownAsterisks(answer));
}

async function answerCourseWithSelectedModels(
  message: string,
  selectedModel: ChatModelOption,
  facts: string,
  verifiedContext: string
) {
  const models = detectMultiModelRequest(message) ? CHAT_MODEL_OPTIONS : [selectedModel];
  const responses = await Promise.all(
    models.map(async (model) => {
      try {
        const answer = await answerCourseWithModel(message, model, verifiedContext);
        return `${model.label}:\n${answer}`;
      } catch {
        return `${model.label}:\nCould not get a response from this local model.`;
      }
    })
  );

  return [facts, '', ...responses].join('\n');
}

async function answerWithDuckDuckGo(message: string, model: ChatModelOption) {
  const searchResults = (await searchDuckDuckGo(message)).slice(0, 5);

  if (searchResults.length === 0) {
    return 'I could not verify that from the available sources.';
  }

  const answer = await requestOllama(
    [
      { role: 'system', content: WEB_SEARCH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          `Search results:\n${formatSearchResultsForPrompt(searchResults)}`,
          '',
          `Model style instruction:\n${getModelStyleInstruction(model.id)}`,
          '',
          `User question:\n${message}`,
        ].join('\n'),
      },
    ],
    model.ollamaModel!
  );

  return `${limitToFiveSentences(stripMarkdownAsterisks(answer))}${formatSourcesUsed(searchResults)}`;
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
    const rememberedCoursesFromMessage = extractRutgersTakenCourses(
      validation.normalizedMessage
    );
    const resolvedModelId = resolveChatModelId(body?.modelId, {
      stepByStepMode,
      isMathRequest,
    });
    const selectedModel = getChatModelOption(resolvedModelId);
    const messages = sanitizeMessages(body?.messages ?? []);
    const debateMode = body?.debateMode === true;
    const debateFollowUp = body?.debateFollowUp === true;
    const debateModelIds = Array.isArray(body?.debateModelIds)
      ? body.debateModelIds.filter((modelId: unknown) => typeof modelId === 'string')
      : [];
    const debateDepth =
      body?.debateDepth === 'quick' || body?.debateDepth === 'deep' || body?.debateDepth === 'standard'
        ? body.debateDepth
        : 'standard';
    const debateMaxRounds =
      typeof body?.maxRounds === 'number' ? body.maxRounds : undefined;
    
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
    const detectedIntent = detectRouteIntent(validation.normalizedMessage);
    const detectedCourseCodes = extractRutgersCourseCodes(validation.normalizedMessage);
    const detectedSocTerm = detectSocTerm(validation.normalizedMessage);
    const localCourseLookup = getLocalRutgersCoursesForQuestion(validation.normalizedMessage);
    const localCourseAnswer = answerLocalRutgersCourseQuestion(validation.normalizedMessage);
    let dataSourceUsed: 'local_dataset' | 'rutgers_soc_api' | 'duckduckgo_search' | 'model_only' = 'model_only';

    let debateThread = null;

    if (debateFollowUp && body?.debateThread) {
      debateThread = await runDebateFollowUp(body.debateThread, validation.normalizedMessage);
      content = 'Debate follow-up answered.';
      dataSourceUsed =
        debateThread.contextUsed === 'SOC API'
          ? 'rutgers_soc_api'
          : debateThread.contextUsed === 'DuckDuckGo'
            ? 'duckduckgo_search'
            : debateThread.contextUsed === 'local data'
              ? 'local_dataset'
              : 'model_only';
    } else if (debateMode) {
      const debate = await runDebateMode(validation.normalizedMessage, debateModelIds, {
        depth: debateDepth,
        maxRounds: debateMaxRounds,
      });
      content = debate.formatted;
      debateThread = debate.thread;
      dataSourceUsed =
        debate.context.kind === 'SOC API'
          ? 'rutgers_soc_api'
          : debate.context.kind === 'DuckDuckGo'
            ? 'duckduckgo_search'
            : debate.context.kind === 'local data'
              ? 'local_dataset'
              : 'model_only';
    } else if (detectedIntent === 'schedule') {
      dataSourceUsed = 'rutgers_soc_api';
      const socAnswer = await answerWithRutgersSoc(
        validation.normalizedMessage,
        selectedModel
      );
      content = socAnswer.content;
    } else if (localCourseAnswer) {
      dataSourceUsed = 'local_dataset';
      if (localCourseLookup?.missingCodes.length) {
        content = 'I do not have verified data for that course yet.';
      } else if (localCourseLookup?.courses.length) {
        content = await answerCourseWithSelectedModels(
          validation.normalizedMessage,
          selectedModel,
          formatVerifiedCourseFacts(localCourseLookup.courses),
          formatCourseContextForModel(localCourseLookup.courses)
        );
      } else {
        content = localCourseAnswer;
      }
    } else if (detectedIntent === 'curriculum') {
      dataSourceUsed = 'duckduckgo_search';
      content = await answerWithDuckDuckGo(
        validation.normalizedMessage,
        selectedModel
      );
    } else if (rememberedCoursesFromMessage.length > 0) {
      dataSourceUsed = 'local_dataset';
      const rememberedCodes = rememberedCoursesFromMessage.map((course) => course.code).join(', ');
      content = `Got it. I will remember that you completed: ${rememberedCodes}.\n\nWhen you ask me to build a Rutgers schedule, I will skip those courses.`;
    } else if (!isMathRequest && shouldUseDuckDuckGoSearch(validation.normalizedMessage)) {
      dataSourceUsed = 'duckduckgo_search';
      content = await answerWithDuckDuckGo(
        validation.normalizedMessage,
        selectedModel
      );
    } else {
      // Local Ollama Models [cite: 13, 14]
      content = await requestOllama(promptMessages, selectedModel.ollamaModel!);

      if (isMathRequest) {
        content = formatStepByStepResponse(content, validation.normalizedMessage);
      }
    }

    console.log('Detected intent:', detectedIntent);
    console.log('Data source used:', dataSourceUsed);
    console.log('Course code detected:', detectedCourseCodes.join(', ') || 'none');
    console.log('Year/term used:', `${detectedSocTerm.year}/${detectedSocTerm.term}`);

    const conversationId = createConversationId(body?.conversationId);

    return NextResponse.json({
      conversationId,
      content: content.trim(),
      durationMs: Date.now() - startTime,
      modelId: selectedModel.id,
      modelLabel: selectedModel.label,
      modelDescription: selectedModel.details,
      stepByStepMode: isMathRequest,
      debateThread,
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
