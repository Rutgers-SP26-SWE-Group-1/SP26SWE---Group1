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

Use the verified context below to answer the user's question.
If the context contains the factual answer, summarize it concisely.
If the context only provides links or directions to the answer, kindly explain that and direct the user to those sources.
Do not hallucinate facts not present in the context.

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
- Use as many steps as you need for the specific problem (do not force exactly 3 steps).
- Do not reveal hidden chain-of-thought or private reasoning.
- DO NOT use bolding (**), asterisks, or markdown on the required headings. Just use plain text for the headers.
- Always respond using exactly these headings in this exact order:

Understanding:
<short description of the problem>

Solution:
<your step-by-step breakdown, numbered as needed>

Final Answer:
<final result>
`.trim();

const STEP_BY_STEP_SECTIONS = ['Understanding', 'Solution', 'Final Answer'] as const;

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

function formatStepByStepResponse(content: string, question: string) {
  const normalizedContent = content.replace(/\*\*/g, '').replace(/#/g, '');

  const understanding = extractLabeledSection(normalizedContent, 'Understanding');
  const solution = extractLabeledSection(normalizedContent, 'Solution');
  const finalAnswer = extractLabeledSection(normalizedContent, 'Final Answer');

  if (understanding && solution && finalAnswer) {
    return [
      'Understanding:', understanding, '', 
      'Solution:', solution, '', 
      'Final Answer:', finalAnswer
    ].join('\n');
  }

  return [
    'Understanding:', `We need to solve: ${question.trim()}`, '', 
    'Solution:', normalizedContent.trim(), '', 
    'Final Answer:', 'See solution above.'
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

function formatSourcesUsed(results: SearchResult[]) {
  if (results.length === 0) return '';
  return ['\n\nSources used:', ...results.map((result) => `• ${result.title} - ${result.url}`)].join('\n');
}

// ============================================================================
// CUSTOM LIVE DATA FETCHERS (NO API KEYS REQUIRED)
// ============================================================================

async function getLiveWeather(query: string) {
  try {
    const location = query.toLowerCase().includes('robbinsville') ? 'Robbinsville,NJ' : 'New_Brunswick,NJ';
    
    // wttr.in sometimes blocks automated scripts. Adding a User-Agent bypasses this.
    const res = await fetch(`https://wttr.in/${location}?format=j1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    
    const current = data.current_condition[0];
    const forecast = data.weather[0]; 
    
    return `Live Weather for ${location.replace('_', ' ')}:\nCurrent Temp: ${current.temp_F}°F\nCondition: ${current.weatherDesc[0].value}\nFeels Like: ${current.FeelsLikeF}°F\nToday's High/Low: ${forecast.maxtempF}°F / ${forecast.mintempF}°F.`;
  } catch (e) {
    return null;
  }
}

async function getRutgersNews() {
  try {
    // Rutgers IT officially maintains a highly stable RSS feed
    const res = await fetch('https://it.rutgers.edu/feed/');
    if (!res.ok) return null;
    const xml = await res.text();
    
    // FIX: Split the XML by <item> so we ONLY parse actual news articles, 
    // and completely ignore SVG/HTML UI metadata.
    const items = xml.split('<item>').slice(1, 4);
    if (items.length === 0) return null;

    let newsContext = "Latest Rutgers News:\n";
    items.forEach((item, i) => {
      // Safely extract the title and link, ignoring CDATA tags if present
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      
      if (titleMatch && linkMatch) {
        newsContext += `${i + 1}. ${titleMatch[1]} (Link: ${linkMatch[1]})\n`;
      }
    });
    
    return newsContext;
  } catch (e) {
    return null;
  }
}

function detectRouteIntent(message: string): 'weather' | 'news' | 'course_info' | 'schedule' | 'curriculum' | 'general' {
  const normalized = message.toLowerCase();
  if (normalized.includes('weather') || normalized.includes('temperature')) return 'weather';
  if (normalized.includes('news') || normalized.includes('happening at rutgers')) return 'news';
  if (detectScheduleIntent(message)) return 'schedule';
  if (normalized.includes('curriculum') || normalized.includes('degree') || normalized.includes('requirement')) return 'curriculum';
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
  if (!response.ok) {
    // Fixed: Catches specific rate limit / 502 errors from Groq
    const text = await response.text();
    if (response.status === 429) throw new Error("Groq Rate Limit Exceeded: Too many requests. Please wait a minute.");
    throw new Error(`Groq API Error (${response.status}): ${text.slice(0, 80)}`);
  }
  const data = await JSON.parse(await response.text());
  return data.choices[0].message.content;
}

async function requestOllama(messages: ChatMessage[], model: string) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (!response.ok) throw new Error(`The local Ollama model "${model}" is not downloaded. Run 'ollama pull ${model}' in your terminal.`);
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

    const stepByStepMode = body?.stepByStepMode === true;
    const isMathRequest = detectMathReasoningRequest(validation.normalizedMessage, stepByStepMode);
    const debateMode = body?.debateMode === true;
    const debateFollowUp = body?.debateFollowUp === true;
    
    const modelIds: string[] = Array.isArray(body?.modelIds) 
        ? body.modelIds.filter((id: unknown) => typeof id === 'string')
        : [body?.modelId || 'gemini-2.5-flash'];

    const messages = sanitizeMessages(body?.messages ?? []);
    
    const chatHistory: ChatMessage[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const startTime = Date.now();
    let dataSourceUsed = 'model_only';
    let searchResultsData: SearchResult[] = []; 

    // --- DEBATE MODE BYPASS ---
    if (debateFollowUp && body?.debateThread) {
      try {
        const debateThread = await runDebateFollowUp(body.debateThread, validation.normalizedMessage);
        return NextResponse.json({
           conversationId: createConversationId(body.conversationId),
           responses: [{ modelId: 'debate', modelLabel: 'Debate Mode', content: 'Debate follow-up answered.', durationMs: Date.now() - startTime, status: 'success' }],
           debateThread,
           timestamp: new Date().toISOString()
        });
      } catch (e: any) {
        return NextResponse.json({ error: `Could not reach Debate Models: ${e.message}` }, { status: 503 });
      }
    } else if (debateMode && body?.debateModelIds) {
      try {
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
      } catch (e: any) {
        return NextResponse.json({ error: `Debate Mode failed. Ensure local models are downloaded. Error: ${e.message}` }, { status: 503 });
      }
    }

    // --- TOOL DATA FETCHING & CONTEXT EXTRACTION ---
    let systemOverride = RUTGERS_SYSTEM_PROMPT;
    let toolContextPrompt: ChatMessage | null = null;
    let staticResponse: string | null = null;

    const detectedIntent = detectRouteIntent(validation.normalizedMessage);
    const localCourseAnswer = answerLocalRutgersCourseQuestion(validation.normalizedMessage);
    const rememberedCoursesFromMessage = extractRutgersTakenCourses(validation.normalizedMessage);

    if (detectedIntent === 'weather') {
      dataSourceUsed = 'custom_weather_api';
      const weatherData = await getLiveWeather(validation.normalizedMessage);
      if (weatherData) {
         systemOverride = "You are Scarlet AI. Use the provided live weather data to concisely answer the user's question and recommend what they should wear/do.";
         toolContextPrompt = { role: 'user', content: `Live Data:\n${weatherData}\n\nUser question:\n${validation.normalizedMessage}` };
      } else {
         staticResponse = "I am currently unable to fetch the live weather data.";
      }
    } else if (detectedIntent === 'news') {
      dataSourceUsed = 'rutgers_rss_feed';
      const newsData = await getRutgersNews();
      if (newsData) {
         systemOverride = "You are Scarlet AI. Summarize the provided news headlines clearly and conversationally. Always include the source links at the bottom of your response.";
         toolContextPrompt = { role: 'user', content: `Live News Data:\n${newsData}\n\nUser question:\n${validation.normalizedMessage}` };
      } else {
         staticResponse = "I could not retrieve the latest news from Rutgers at this moment.";
      }
    } else if (detectedIntent === 'schedule') {
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
      const localCourseLookup = getLocalRutgersCoursesForQuestion(validation.normalizedMessage);
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
         searchResultsData = searchResults;
         systemOverride = WEB_SEARCH_SYSTEM_PROMPT;
         toolContextPrompt = { role: 'user', content: `Search results:\n${formatSearchResultsForPrompt(searchResults)}\n\nUser question:\n${validation.normalizedMessage}` };
       }
    } else if (rememberedCoursesFromMessage.length > 0) {
       dataSourceUsed = 'local_dataset';
       const rememberedCodes = rememberedCoursesFromMessage.map((course) => course.code).join(', ');
       staticResponse = `Got it. I will remember that you completed: ${rememberedCodes}.\n\nWhen you ask me to build a Rutgers schedule, I will skip those courses.`;
    }

    console.log('Detected intent:', detectedIntent);
    console.log('Data source used:', dataSourceUsed);

    if (staticResponse) {
       return NextResponse.json({
         conversationId: createConversationId(body?.conversationId),
         responses: [{ modelId: 'system', modelLabel: 'Scarlet AI Tool', content: staticResponse, durationMs: Date.now() - startTime, status: 'success' }],
         timestamp: new Date().toISOString(),
         stepByStepMode: isMathRequest
       });
    }

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

            if (isMathRequest) {
                generatedContent = formatStepByStepResponse(generatedContent, validation.normalizedMessage);
            } else if (systemOverride !== RUTGERS_SYSTEM_PROMPT && dataSourceUsed !== 'model_only' && dataSourceUsed !== 'rutgers_rss_feed') {
                generatedContent = limitToFiveSentences(stripMarkdownAsterisks(generatedContent));
            }

            if (dataSourceUsed === 'duckduckgo_search' && searchResultsData.length > 0) {
                generatedContent += '\n' + formatSourcesUsed(searchResultsData);
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
                content: e.message, 
                durationMs: Date.now() - executeStart, 
                status: 'error' 
            };
        }
    };

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