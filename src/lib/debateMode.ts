import { DEFAULT_CHAT_MODEL, getChatModelOption, type ChatModelOption } from '@/lib/chat-models';
import { searchDuckDuckGo } from '@/lib/duckDuckGoSearch';
import {
  detectScheduleIntent,
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

export type DebateContextKind = 'local data' | 'SOC API' | 'DuckDuckGo' | 'none';

export type DebateContext = {
  kind: DebateContextKind;
  intent: 'rutgers' | 'general';
  contextText: string;
  sourceSummary: string;
};

export type DebateMessage = {
  id: string;
  model: string;
  role: 'opening' | 'rebuttal' | 'followup' | 'judge';
  content: string;
  timestamp: string;
  round: number;
};

export type DebateVerdict = {
  status: 'consensus' | 'consensus_with_caveats' | 'no_consensus' | 'still_debating';
  summary: string;
  modelPositions: Record<string, string>;
  reachedRound?: number;
};

export type DebateThread = {
  id: string;
  originalQuestion: string;
  selectedModels: string[];
  contextUsed: string;
  depth: DebateDepth;
  maxRounds: number;
  completedRounds: number;
  messages: DebateMessage[];
  verdict: DebateVerdict;
};

export type DebateDepth = 'quick' | 'standard' | 'deep';

const MODEL_DEBATE_STYLES: Record<string, string> = {
  mistral: 'Be concise and practical.',
  'llama3.2': 'Give a balanced student-friendly explanation.',
  deepseek: 'Focus on reasoning and academic planning.',
  'qwen-coder': 'Focus on technical details and prerequisites.',
  gemma: 'Focus on beginner-friendly explanation.',
};

const ROUND_TITLES: Record<number, string> = {
  1: 'Opening Arguments',
  2: 'First Rebuttal',
  3: 'Response',
  4: 'Refinement',
  5: 'Final Position',
  6: 'Additional Clarification',
  7: 'Closing Position',
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stripMarkdown(content: string) {
  return content.replace(/\*/g, '').replace(/#{1,6}\s*/g, '').trim();
}

function limitSentences(content: string, limit = 5) {
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return sentences.slice(0, limit).join(' ').replace(/\s+/g, ' ').trim();
}

function sanitizeDebateText(content: string, limit = 5) {
  return limitSentences(stripMarkdown(content), limit)
    .replace(/\b(Position|Reasoning summary|Strongest point|Uncertainty):/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampCustomMaxRounds(maxRounds?: number) {
  if (!maxRounds || Number.isNaN(maxRounds)) return 5;
  return Math.min(7, Math.max(5, Math.round(maxRounds)));
}

export function getDebateDepthSettings(depth: DebateDepth = 'standard', maxRounds?: number) {
  if (depth === 'quick') {
    return { depth, maxRounds: 3, label: 'Quick' };
  }

  if (depth === 'deep') {
    return { depth, maxRounds: 7, label: 'Deep' };
  }

  return { depth: 'standard' as const, maxRounds: clampCustomMaxRounds(maxRounds), label: 'Standard' };
}

async function requestOllama(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, model: string) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`Ollama model "${model}" is unavailable.`);
  }

  const data = await response.json();
  return String(data.message?.content ?? '');
}

export function detectQuestionContext(userMessage: string): DebateContext['intent'] {
  const normalized = userMessage.toLowerCase();
  return normalized.includes('rutgers') || /\b\d{2}\s*:\s*\d{3}\s*:\s*\d{3}\b/.test(userMessage)
    ? 'rutgers'
    : 'general';
}

function shouldUseDuckDuckGo(userMessage: string) {
  const normalized = userMessage.toLowerCase();
  const currentOrFactual =
    normalized.includes('current') ||
    normalized.includes('latest') ||
    normalized.includes('deadline') ||
    normalized.includes('policy') ||
    normalized.includes('department') ||
    normalized.includes('requirement') ||
    normalized.includes('graduation') ||
    normalized.includes('rutgers');
  const simpleReasoning =
    normalized.includes('explain recursion') ||
    normalized.includes('recursion') ||
    normalized.includes('coding') ||
    normalized.includes('math');

  return currentOrFactual && !simpleReasoning;
}

export async function getRelevantContext(userMessage: string): Promise<DebateContext> {
  const localLookup = getLocalRutgersCoursesForQuestion(userMessage);

  if (localLookup?.courses.length && !detectScheduleIntent(userMessage)) {
    return {
      kind: 'local data',
      intent: 'rutgers',
      contextText: formatCourseContextForModel(localLookup.courses),
      sourceSummary: formatVerifiedCourseFacts(localLookup.courses),
    };
  }

  if (detectScheduleIntent(userMessage)) {
    const term = detectSocTerm(userMessage);
    const courses = filterSocCourses(await fetchRutgersSocCourses(term, 'NB'), userMessage);
    const contextText = formatSocContext(courses, term);

    return {
      kind: 'SOC API',
      intent: 'rutgers',
      contextText,
      sourceSummary: contextText
        ? `Rutgers Schedule of Classes for ${term.label} ${term.year}`
        : 'No Rutgers SOC context was available.',
    };
  }

  if (shouldUseDuckDuckGo(userMessage)) {
    const results = await searchDuckDuckGo(userMessage);
    const contextText = results
      .slice(0, 5)
      .map((result, index) => `Result ${index + 1}\nTitle: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`)
      .join('\n\n');

    return {
      kind: 'DuckDuckGo',
      intent: detectQuestionContext(userMessage),
      contextText,
      sourceSummary: contextText || 'No DuckDuckGo results were available.',
    };
  }

  return {
    kind: 'none',
    intent: detectQuestionContext(userMessage),
    contextText: '',
    sourceSummary: 'No external context used.',
  };
}

function resolveDebateModels(selectedModels: string[]) {
  const modelIds = Array.from(new Set(selectedModels)).slice(0, 5);
  const models = (modelIds.length > 0 ? modelIds : [DEFAULT_CHAT_MODEL.id, 'gemma'])
    .map((modelId) => getChatModelOption(modelId))
    .filter(Boolean)
    .slice(0, 5);

  return models.length >= 2 ? models : [DEFAULT_CHAT_MODEL, getChatModelOption('gemma')];
}

function baseSystemPrompt(model: ChatModelOption) {
  return [
    'You are participating in a short debate with another AI model.',
    'Use only the verified context when stating facts.',
    'If evidence is missing, say what cannot be verified.',
    'Do not show private chain-of-thought.',
    'Give concise conversational reasoning summaries only.',
    'Use plain text only. No markdown. No asterisks. No bold.',
    'Do not repeat labels like Position, Reasoning summary, Strongest point, or Uncertainty.',
    MODEL_DEBATE_STYLES[model.id] ?? 'Give a clear student-friendly argument.',
  ].join('\n');
}

function unavailableMessage(model: ChatModelOption, role: DebateMessage['role'], round: number): DebateMessage {
  return {
    id: createId('debate-message'),
    model: model.label,
    role,
    content: 'I cannot join this round because this local Ollama model is unavailable.',
    timestamp: new Date().toISOString(),
    round,
  };
}

export async function generateModelArgument(
  model: ChatModelOption,
  userMessage: string,
  context: DebateContext,
  round = 1
): Promise<DebateMessage> {
  if (!model.ollamaModel) {
    throw new Error(`${model.label} is missing an Ollama model name.`);
  }

  const answer = await requestOllama(
    [
      { role: 'system', content: baseSystemPrompt(model) },
      {
        role: 'user',
        content: [
          `Verified context source: ${context.kind}`,
          `Verified context:\n${context.contextText || 'No verified external context provided.'}`,
          '',
          `User question:\n${userMessage}`,
          '',
          'Give a concise opening argument in 3-5 sentences.',
          'Speak naturally, as if you are talking to the other selected models.',
        ].join('\n'),
      },
    ],
    model.ollamaModel
  );

  return {
    id: createId('debate-message'),
    model: model.label,
    role: 'opening',
    content: sanitizeDebateText(answer),
    timestamp: new Date().toISOString(),
    round,
  };
}

async function generateRoundResponseMessage(
  model: ChatModelOption,
  userMessage: string,
  context: DebateContext,
  previousRoundMessages: DebateMessage[],
  currentRound: number,
  maxRounds: number
): Promise<DebateMessage> {
  if (!model.ollamaModel) {
    throw new Error(`${model.label} is missing an Ollama model name.`);
  }

  const previousArguments = previousRoundMessages
    .filter((message) => message.model !== model.label)
    .map((message) => `${message.model}: ${message.content}`)
    .join('\n\n');

  const answer = await requestOllama(
    [
      { role: 'system', content: baseSystemPrompt(model) },
      {
        role: 'user',
        content: [
          `Verified context source: ${context.kind}`,
          `Verified context:\n${context.contextText || 'No verified external context provided.'}`,
          '',
          `Original question:\n${userMessage}`,
          '',
          `Previous round arguments:\n${previousArguments || 'No previous argument was available.'}`,
          '',
          `This is round ${currentRound} of a maximum of ${maxRounds}.`,
          'Respond to the previous round.',
          'You may reinforce your position, revise your position, agree with another model, or explain why you still disagree.',
          'If you agree on the main answer but still have caveats, say that naturally.',
          'Keep it under 5 sentences and do not use labels.',
        ].join('\n'),
      },
    ],
    model.ollamaModel
  );

  return {
    id: createId('debate-message'),
    model: model.label,
    role: 'rebuttal',
    content: sanitizeDebateText(answer),
    timestamp: new Date().toISOString(),
    round: currentRound,
  };
}

export async function generateFollowUpMessage(
  model: ChatModelOption,
  thread: DebateThread,
  followUp: string,
  round = thread.completedRounds + 1
): Promise<DebateMessage> {
  if (!model.ollamaModel) {
    throw new Error(`${model.label} is missing an Ollama model name.`);
  }

  const threadSoFar = thread.messages
    .slice(-10)
    .map((message) => `${message.model} (${message.role}): ${message.content}`)
    .join('\n\n');

  const answer = await requestOllama(
    [
      { role: 'system', content: baseSystemPrompt(model) },
      {
        role: 'user',
        content: [
          `Original question:\n${thread.originalQuestion}`,
          '',
          `Context used: ${thread.contextUsed}`,
          '',
          `Debate so far:\n${threadSoFar}`,
          '',
          `Follow-up question:\n${followUp}`,
          '',
          'Answer this follow-up as your own voice in the debate.',
          'Keep it under 5 sentences and grounded in the original context.',
        ].join('\n'),
      },
    ],
    model.ollamaModel
  );

  return {
    id: createId('debate-message'),
    model: model.label,
    role: 'followup',
    content: sanitizeDebateText(answer),
    timestamp: new Date().toISOString(),
    round,
  };
}

function latestRoundMessages(messages: DebateMessage[]) {
  const debateMessages = messages.filter((message) => message.role !== 'followup');
  const latestRound = Math.max(1, ...debateMessages.map((message) => message.round || 1));
  return debateMessages.filter((message) => (message.round || 1) === latestRound);
}

function extractModelPositions(messages: DebateMessage[]) {
  const latestByModel = new Map<string, DebateMessage>();

  for (const message of messages.filter((item) => item.role !== 'followup')) {
    latestByModel.set(message.model, message);
  }

  return Array.from(latestByModel.values()).reduce<Record<string, string>>((positions, message) => {
    positions[message.model] = limitSentences(message.content, 1) || message.content;
    return positions;
  }, {});
}

export function checkConsensus(messages: DebateMessage[]): DebateVerdict {
  const latestMessages = latestRoundMessages(messages);
  const modelPositions = extractModelPositions(messages);
  const latestText = latestMessages.map((message) => message.content.toLowerCase()).join(' ');
  const latestRound = Math.max(1, ...latestMessages.map((message) => message.round || 1));
  const unavailableCount = latestMessages.filter((message) =>
    message.content.toLowerCase().includes('unavailable')
  ).length;
  const agreementCount = latestMessages.filter((message) =>
    /\b(agree|same conclusion|same recommendation|consensus|converge|aligned|i accept|i would also)\b/i.test(message.content)
  ).length;
  const caveatCount = latestMessages.filter((message) =>
    /\b(caveat|but|however|as long as|provided that|unless|concern)\b/i.test(message.content)
  ).length;
  const disagreementCount = latestMessages.filter((message) =>
    /\b(disagree|do not agree|still disagree|different recommendation|opposite|instead|rather than)\b/i.test(message.content)
  ).length;

  if (unavailableCount > 0) {
    return {
      status: 'still_debating',
      summary: 'Still debating. At least one selected model was unavailable, so the thread needs another usable round before a verdict is reliable.',
      modelPositions,
    };
  }

  if (latestMessages.length >= 2 && disagreementCount === 0 && agreementCount >= Math.ceil(latestMessages.length / 2)) {
    return {
      status: caveatCount > 0 ? 'consensus_with_caveats' : 'consensus',
      summary:
        caveatCount > 0
          ? `Consensus with caveats reached in Round ${latestRound}. The models agree on the main conclusion, but they still flagged conditions or tradeoffs.`
          : `Consensus reached in Round ${latestRound}. The models agree on the main recommendation.`,
      modelPositions,
      reachedRound: latestRound,
    };
  }

  if (latestText.includes('cannot verify') || latestText.includes('could not verify')) {
    return {
      status: 'consensus_with_caveats',
      summary: `Consensus with caveats reached in Round ${latestRound}. The models align that the available context is not enough to verify a stronger answer.`,
      modelPositions,
      reachedRound: latestRound,
    };
  }

  return {
    status: 'still_debating',
    summary: `Still debating after Round ${latestRound}. The models have not clearly agreed on the core recommendation yet.`,
    modelPositions,
  };
}

export function shouldContinueDebate(messages: DebateMessage[], currentRound: number, maxRounds: number) {
  const verdict = checkConsensus(messages);
  return verdict.status === 'still_debating' && currentRound < maxRounds;
}

export function generateFinalVerdict(messages: DebateMessage[], context: DebateContext, maxRounds = 5): DebateVerdict {
  const consensus = checkConsensus(messages);
  const latestRound = Math.max(1, ...messages.map((message) => message.round || 1));

  if (consensus.status === 'consensus' || consensus.status === 'consensus_with_caveats') {
    return consensus;
  }

  const modelPositions = extractModelPositions(messages);
  const unavailableCount = messages.filter((message) =>
    message.content.toLowerCase().includes('unavailable')
  ).length;
  const cannotVerifyCount = messages.filter((message) =>
    message.content.toLowerCase().includes('cannot verify') ||
    message.content.toLowerCase().includes('could not verify')
  ).length;

  if (latestRound >= maxRounds || unavailableCount > 0 || cannotVerifyCount > 0) {
    return {
      status: 'no_consensus',
      summary: `No consensus after ${Math.min(latestRound, maxRounds)} rounds. The selected models did not agree on one clear conclusion from ${context.kind} context.`,
      modelPositions,
    };
  }

  return consensus;
}

export function getRoundTitle(round: number) {
  return ROUND_TITLES[round] ?? `Round ${round}`;
}

export async function runDebateMode(
  userMessage: string,
  selectedModels: string[],
  options: { depth?: DebateDepth; maxRounds?: number } = {}
) {
  const models = resolveDebateModels(selectedModels);
  const context = await getRelevantContext(userMessage);
  const depthSettings = getDebateDepthSettings(options.depth ?? 'standard', options.maxRounds);
  let currentRound = 1;

  const openingMessages = await Promise.all(
    models.map(async (model) => {
      try {
        return await generateModelArgument(model, userMessage, context, currentRound);
      } catch {
        return unavailableMessage(model, 'opening', currentRound);
      }
    })
  );

  const messages = [...openingMessages];

  while (shouldContinueDebate(messages, currentRound, depthSettings.maxRounds)) {
    currentRound += 1;
    const previousRoundMessages = messages.filter((message) => message.round === currentRound - 1);
    const roundMessages = await Promise.all(
      models.map(async (model) => {
        try {
          return await generateRoundResponseMessage(
            model,
            userMessage,
            context,
            previousRoundMessages,
            currentRound,
            depthSettings.maxRounds
          );
        } catch {
          return unavailableMessage(model, 'rebuttal', currentRound);
        }
      })
    );
    messages.push(...roundMessages);
  }

  const verdict = generateFinalVerdict(messages, context, depthSettings.maxRounds);
  const thread: DebateThread = {
    id: createId('debate-thread'),
    originalQuestion: userMessage,
    selectedModels: models.map((model) => model.id),
    contextUsed: context.kind,
    depth: depthSettings.depth,
    maxRounds: depthSettings.maxRounds,
    completedRounds: currentRound,
    messages,
    verdict,
  };

  return {
    context,
    thread,
    formatted: `Debate started: ${userMessage}`,
  };
}

export async function runDebateFollowUp(thread: DebateThread, followUp: string) {
  const models = resolveDebateModels(thread.selectedModels);
  const followUpRound = (thread.completedRounds ?? thread.maxRounds ?? 5) + 1;
  const followUpMessages = await Promise.all(
    models.map(async (model) => {
      try {
        return await generateFollowUpMessage(model, thread, followUp, followUpRound);
      } catch {
        return unavailableMessage(model, 'followup', followUpRound);
      }
    })
  );
  const syntheticContext: DebateContext = {
    kind: thread.contextUsed as DebateContextKind,
    intent: thread.contextUsed === 'none' ? 'general' : 'rutgers',
    contextText: '',
    sourceSummary: thread.contextUsed,
  };
  const updatedMessages = [...thread.messages, ...followUpMessages];

  return {
    ...thread,
    completedRounds: followUpRound,
    messages: updatedMessages,
    verdict: generateFinalVerdict(updatedMessages, syntheticContext, thread.maxRounds ?? 5),
  };
}
