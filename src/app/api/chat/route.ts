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

// ============================================================================
// SYSTEM PROMPTS & CONSTANTS
// ============================================================================

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
  'gemini-2.5-flash': 'Provide a highly accurate, lightning-fast explanation.',
  'llama-3.1-8b-instant': 'Provide a rapid, highly structured response.'
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

const STEP_BY_STEP_SECTIONS = ['Understanding', 'Step 1', 'Step 2', 'Step 3', 'Final Answer'] as const;

// ============================================================================
// HELPER & FORMATTING FUNCTIONS
// ============================================================================

function buildRutgersGroundingContext(message: string) {
  const normalized = message.toLowerCase();
  const isTransitQuestion =
    normalized.includes('rutgers bus') || normalized.includes('bus route') ||
    normalized.includes('shuttle') || normalized.includes('passio') ||
    normalized.includes('dots') || normalized.includes('new brunswick bus') ||
    normalized.includes('newark bus') || normalized.includes('camden bus');

  if (!isTransitQuestion) return null;

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
- If the user asks for current timing, delays, or stop-by-stop directions, say they should verify in Passio GO or Rutgers DOTS.
  `.trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLabeledSection(content: string, label: string) {
  const labelsPattern = STEP_BY_STEP_SECTIONS.map(escapeRegExp).join('|');
  const regex = new RegExp(`${escapeRegExp(label)}:\\s*([\\s\\S]*?)(?=\\n(?:${labelsPattern}):|$)`, 'i');
  const match = content.match(regex);
  return match?.[1]?.trim() ?? '';
}

function splitIntoTeachingChunks(content: string) {
  return content.split(/\n\s*\n|(?<=\.)\s+(?=[A-Z])|(?<=\d)\.\s+/).map((segment) => segment.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
}

function formatStepByStepResponse(content: string, question: string) {
  const understanding = extractLabeledSection(content, 'Understanding');
  const step1 = extractLabeledSection(content, 'Step 1');
  const step2 = extractLabeledSection(content, 'Step 2');
  const step3 = extractLabeledSection(content, 'Step 3');
  const finalAnswer = extractLabeledSection(content, 'Final Answer');

  if (understanding && step1 && step2 && step3 && finalAnswer) {
    return ['Understanding:', understanding, '', 'Step 1:', step1, '', 'Step 2:', step2, '', 'Step 3:', step3, '', 'Final Answer:', finalAnswer].join('\n');
  }

  const segments = splitIntoTeachingChunks(content);
  return [
    'Understanding:', understanding || `We need to solve: ${question.trim()}`, '',
    'Step 1:', step1 || segments[0] || 'Identify the quantities, symbols, and goal of the problem.', '',
    'Step 2:', step2 || segments[1] || 'Apply the correct math rule or operation carefully.', '',
    'Step 3:', step3 || segments[2] || 'Check the result and make sure it answers the original question.', '',
    'Final Answer:', finalAnswer || segments[segments.length - 1] || 'The solution is shown above.'
  ].join('\n');
}

function stripMarkdownAsterisks(content: string) {
  return content.replace(/\*/g, '').trim();
}

function limitToFiveSentences(content: string) {
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return sentences.slice(0, 5).join(' ').replace(/\s+/g, ' ').trim();
}

function formatSearchResultsForPrompt(results: SearchResult[]) {
  return results.map((result, index) => [`Result ${index + 1}`, `Title: ${result.title}`, `URL: ${result.url}`, `Snippet: ${result.snippet}`].join('\n')).join('\n\n');
}

function shouldUseDuckDuckGoSearch(message: string) {
  const normalized = message.toLowerCase();
  const isCasual = /^(hi|hello|hey|thanks|thank you)\b/.test(normalized) || normalized.includes('how are you');
  const asksForCodingHelp = normalized.includes('code') || normalized.includes('debug') || normalized.includes('typescript') || normalized.includes('javascript') || normalized.includes('react');
  const asksCurrentOrFactual = normalized.includes('current') || normalized.includes('latest') || normalized.includes('today') || normalized.includes('deadline') || normalized.includes('policy') || normalized.includes('professor') || normalized.includes('instructor') || normalized.includes('rutgers') || normalized.includes('course details') || normalized.includes('course fact') || normalized.includes('when is') || normalized.includes('what is the') || normalized.includes('who is') || normalized.includes('weather');

  return asksCurrentOrFactual && !isCasual && !asksForCodingHelp;
}

function detectRouteIntent(message: string): 'course_info' | 'schedule' | 'curriculum' | 'general' {
  const normalized = message.toLowerCase();
  if (detectScheduleIntent(message)) return 'schedule';
  if (normalized.includes('curriculum') || normalized.includes('degree') || normalized.includes('requirement') || normalized.includes('requirements') || normalized.includes('required courses') || normalized.includes('need to take')) return 'curriculum';
  if (extractRutgersCourseCodes(message).length > 0) return 'course_info';
  return 'general';
}

function getModelStyleInstruction(modelId: string) {
  return MODEL_STYLE_INSTRUCTIONS[modelId] ?? 'Give a clear student-friendly explanation.';
}

// ============================================================================
// API PRODUCERS (CLOUD & LOCAL)
// ============================================================================

async function requestGemini(messages: ChatMessage[], apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error?.message || `Gemini API Error`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function requestGroq(messages: ChatMessage[], apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages }),
  });
  if (!response.ok) throw new Error(`Groq API Error`);
  const data = await response.json();
  return data.choices[0].message.content;
}

async function requestOllama(messages: ChatMessage[], model: string) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (!response.ok) throw new Error(`Ollama model "${model}" not found or service error.`);
  const data = await response.json();
  return data.message.content;
}

// ============================================================================
// MAIN POST ROUTE CONTROLLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateChatRequest(body?.message);

    if (!validation.isValid || !validation.normalizedMessage) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // --- 1. PARSE REQUEST INTENT & MODES ---
    const stepByStepMode = body?.stepByStepMode === true;
    const isMathRequest = detectMathReasoningRequest(validation.normalizedMessage, stepByStepMode);
    const debateMode = body?.debateMode === true;
    const debateFollowUp = body?.debateFollowUp === true;
    
    // Parse model array for Smart Queuing
    let modelIds: string[] = Array.isArray(body?.modelIds) 
        ? body.modelIds.filter((id: unknown) => typeof id === 'string')
        : [body?.modelId || 'gemini-2.5-flash'];

    // Enforce DeepSeek for Step-By-Step Math per original logic
    if (isMathRequest) {
        modelIds = ['deepseek'];
    }

    const messages = sanitizeMessages(body?.messages ?? []);
    
    // Maintain History Memory
    const chatHistory: ChatMessage[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const startTime = Date.now();
    let dataSourceUsed: 'local_dataset' | 'rutgers_soc_api' | 'duckduckgo_search' | 'model_only' = 'model_only';

    // --- 2. DEBATE MODE BYPASS ---
    if (debateFollowUp && body?.debateThread) {
      const debateThread = await runDebateFollowUp(body.debateThread, validation.normalizedMessage);
      return NextResponse.json({
         conversationId: createConversationId(body.conversationId),
         responses: [{ modelId: 'debate', modelLabel: 'Debate Mode', content: 'Debate follow-up answered.', durationMs: Date.now() - startTime, status: 'success' }],
         debateThread,
         timestamp: new Date().toISOString()
      });
    } else if (debateMode && body?.debateModelIds) {
      const debateModelIds = Array.isArray(body.debateModelIds) ? body.debateModelIds : ['mistral', 'gemma'];
      const debateDepth = body?.debateDepth || 'standard';
      const debate = await runDebateMode(validation.normalizedMessage, debateModelIds, {
        depth: debateDepth as 'quick' | 'standard' | 'deep',
        maxRounds: typeof body?.maxRounds === 'number' ? body.maxRounds : undefined,
      });
      return NextResponse.json({
         conversationId: createConversationId(body.conversationId),
         responses: [{ modelId: 'debate', modelLabel: 'Debate Mode', content: debate.formatted, durationMs: Date.now() - startTime, status: 'success' }],
         debateThread: debate.thread,
         timestamp: new Date().toISOString()
      });
    }

    // --- 3. TOOL DATA FETCHING & CONTEXT EXTRACTION ---
    let systemOverride = RUTGERS_SYSTEM_PROMPT;
    let toolContextPrompt: ChatMessage | null = null;
    let staticResponse: string | null = null;

    const detectedIntent = detectRouteIntent(validation.normalizedMessage);
    const detectedCourseCodes = extractRutgersCourseCodes(validation.normalizedMessage);
    const detectedSocTerm = detectSocTerm(validation.normalizedMessage);
    const rememberedCoursesFromMessage = extractRutgersTakenCourses(validation.normalizedMessage);
    const localCourseLookup = getLocalRutgersCoursesForQuestion(validation.normalizedMessage);
    const localCourseAnswer = answerLocalRutgersCourseQuestion(validation.normalizedMessage);

    if (detectedIntent === 'schedule') {
      dataSourceUsed = 'rutgers_soc_api';
      const term = detectSocTerm(validation.normalizedMessage);
      const allCourses = await fetchRutgersSocCourses(term, 'NB');
      const matchingCourses = filterSocCourses(allCourses, validation.normalizedMessage);
      const context = formatSocContext(matchingCourses, term);
      
      if (context) {
         systemOverride = SOC_SYSTEM_PROMPT;
         toolContextPrompt = { role: 'user', content: `Rutgers Schedule of Classes context:\n${context}\n\nUser question:\n${validation.normalizedMessage}` };
      } else {
         staticResponse = 'I could not verify that from the available Rutgers Schedule of Classes data.';
      }
    } else if (localCourseAnswer) {
      dataSourceUsed = 'local_dataset';
      if (localCourseLookup?.missingCodes.length) {
         staticResponse = 'I do not have verified data for that course yet.';
      } else if (localCourseLookup?.courses.length) {
         systemOverride = 'You are Scarlet AI.\nUse only the verified course data below.\nDo not change factual fields such as course code, title, school, credits, verified next courses, or sources.\nYou may vary only explanation style.\nUse plain text. No asterisks. No bold. Maximum 5 sentences.';
         const formattedFacts = formatVerifiedCourseFacts(localCourseLookup.courses);
         toolContextPrompt = { role: 'user', content: `Verified course data:\n${formatCourseContextForModel(localCourseLookup.courses)}\n\nFacts:\n${formattedFacts}\n\nUser question:\n${validation.normalizedMessage}` };
      } else {
         staticResponse = localCourseAnswer;
      }
    } else if (detectedIntent === 'curriculum') {
       dataSourceUsed = 'duckduckgo_search';
       const searchResults = (await searchDuckDuckGo(validation.normalizedMessage)).slice(0, 5);
       if (searchResults.length === 0) {
         staticResponse = 'I could not verify that from the available sources.';
       } else {
         systemOverride = WEB_SEARCH_SYSTEM_PROMPT;
         toolContextPrompt = { role: 'user', content: `Search results:\n${formatSearchResultsForPrompt(searchResults)}\n\nUser question:\n${validation.normalizedMessage}` };
       }
    } else if (rememberedCoursesFromMessage.length > 0) {
       dataSourceUsed = 'local_dataset';
       const rememberedCodes = rememberedCoursesFromMessage.map((course) => course.code).join(', ');
       staticResponse = `Got it. I will remember that you completed: ${rememberedCodes}.\n\nWhen you ask me to build a Rutgers schedule, I will skip those courses.`;
    } else if (!isMathRequest && shouldUseDuckDuckGoSearch(validation.normalizedMessage)) {
       dataSourceUsed = 'duckduckgo_search';
       const searchResults = (await searchDuckDuckGo(validation.normalizedMessage)).slice(0, 5);
       if (searchResults.length > 0) {
         systemOverride = WEB_SEARCH_SYSTEM_PROMPT;
         toolContextPrompt = { role: 'user', content: `Search results:\n${formatSearchResultsForPrompt(searchResults)}\n\nUser question:\n${validation.normalizedMessage}` };
       }
    }

    // --- CONSOLE DEBUGGING FOR TAs ---
    console.log('Detected intent:', detectedIntent);
    console.log('Data source used:', dataSourceUsed);
    console.log('Course code detected:', detectedCourseCodes.join(', ') || 'none');
    console.log('Year/term used:', `${detectedSocTerm.year}/${detectedSocTerm.term}`);

    // If a tool resulted in a static text response, bypass the LLMs entirely
    if (staticResponse) {
       return NextResponse.json({
         conversationId: createConversationId(body?.conversationId),
         responses: [{ modelId: 'system', modelLabel: 'Scarlet AI Tool', content: staticResponse, durationMs: Date.now() - startTime, status: 'success' }],
         timestamp: new Date().toISOString(),
         stepByStepMode: isMathRequest
       });
    }

    // --- 4. BUILD FINAL PROMPT WITH EXTRACTED CONTEXT ---
    const groundingContext = buildRutgersGroundingContext(validation.normalizedMessage);
    const baseSystemPrompt = isMathRequest ? STEP_BY_STEP_REASONING_PROMPT : systemOverride;

    const executeModelStrategy = async (id: string) => {
        const modelOption = getChatModelOption(id);
        const styleInstruct = getModelStyleInstruction(id);
        
        const finalUserPrompt = toolContextPrompt
            ? toolContextPrompt.content.replace('User question:', `Model style instruction:\n${styleInstruct}\n\nUser question:`)
            : `Model style instruction:\n${styleInstruct}\n\nUser question:\n${validation.normalizedMessage}`;

        const finalMessages: ChatMessage[] = [
            { role: 'system', content: baseSystemPrompt },
            ...(groundingContext ? [{ role: 'system' as const, content: groundingContext }] : []),
            ...chatHistory,
            { role: 'user', content: finalUserPrompt }
        ];

        const executeStart = Date.now();
        let generatedContent = '';
        try {
            if (modelOption.provider === 'google') generatedContent = await requestGemini(finalMessages, process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
            else if (modelOption.provider === 'groq') generatedContent = await requestGroq(finalMessages, process.env.GROQ_API_KEY!);
            else generatedContent = await requestOllama(finalMessages, modelOption.ollamaModel!);

            // Apply formatting rules based on intent
            if (isMathRequest) {
                generatedContent = formatStepByStepResponse(generatedContent, validation.normalizedMessage);
            } else if (systemOverride !== RUTGERS_SYSTEM_PROMPT && dataSourceUsed !== 'model_only') {
                generatedContent = limitToFiveSentences(stripMarkdownAsterisks(generatedContent));
            }

            return { 
                modelId: id, 
                modelLabel: modelOption.label, 
                content: generatedContent.trim(), 
                durationMs: Date.now() - executeStart, 
                status: 'success' 
            };
        } catch (e: any) {
            return { 
                modelId: id, 
                modelLabel: modelOption.label, 
                content: `Error: ${e.message}`, 
                durationMs: Date.now() - executeStart, 
                status: 'error' 
            };
        }
    };

    // --- 5. SMART QUEUING (Parallel Cloud, Sequential Local) ---
    const cloudModelIds = modelIds.filter(id => getChatModelOption(id).provider !== 'ollama');
    const localModelIds = modelIds.filter(id => getChatModelOption(id).provider === 'ollama');

    const cloudResults = await Promise.all(cloudModelIds.map(executeModelStrategy));
    const localResults = [];
    for (const id of localModelIds) {
        localResults.push(await executeModelStrategy(id));
    }

    return NextResponse.json({
        conversationId: createConversationId(body?.conversationId),
        responses: [...cloudResults, ...localResults],
        stepByStepMode: isMathRequest,
        timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to process your message.';
    console.error('POST /api/chat failed:', error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}