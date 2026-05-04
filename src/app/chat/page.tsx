'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DebateModeToggle from '@/components/DebateModeToggle';
import DebateThreadPanel, { type DebateThreadView } from '@/components/DebateThreadPanel';
import LogoutButton from '@/components/LogoutButton';
import ModelDebatePanel from '@/components/ModelDebatePanel';
import { detectMathReasoningRequest, resolveChatModelId } from '@/lib/chat-logic';
import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL, getChatModelOption } from '@/lib/chat-models';
import { extractRutgersTakenCourses, getRutgersLoadingState } from '@/lib/rutgers-course-weather';
import { supabase, SUPABASE_ERROR_MESSAGE } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  durationMs?: number;
  modelId?: string;
  modelLabel?: string;
  modelDescription?: string;
  debateThreadId?: string;
  comparisonResponses?: {
    modelId: string;
    modelLabel: string;
    content: string;
    durationMs: number;
    status: string;
  }[];
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  archived?: boolean;
  folderId?: string | null;
  isPinned?: boolean;
};

type ConversationSearchResult = {
  conversation: Conversation;
  preview: string;
  matchType: 'title' | 'message';
  rank: number;
};

type ChatFolder = {
  id: string;
  name: string;
  createdAt: string;
  collapsed: boolean;
};

type TakenCourse = {
  code: string;
  title?: string;
};

const STORAGE_KEY = 'scarlet-ai-conversations';
const FOLDERS_STORAGE_KEY = 'scarlet-ai-folders';
const TAKEN_COURSES_STORAGE_KEY = 'scarlet-ai-taken-courses';
const DEBATE_THREADS_STORAGE_KEY = 'scarlet-ai-debate-threads';
const DEFAULT_FOLDER_NAME = 'Main';
const STEP_BY_STEP_THINKING_MESSAGES = [
  'Understanding problem...',
  'Planning solution...',
  'Generating explanation...',
];

function createId(prefix: string) {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}

function createUntitledConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: createId('conversation'),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
    archived: false,
    folderId: null,
    isPinned: false,
  };
}

function createDefaultFolder(): ChatFolder {
  return {
    id: 'default-main-folder',
    name: DEFAULT_FOLDER_NAME,
    createdAt: new Date().toISOString(),
    collapsed: false,
  };
}

function deriveTitle(message: string) {
  return message.trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 48) || 'New chat';
}

function buildSearchPreview(text: string, query: string, maxLength = 80) {
  const normalizedText = text.toLowerCase();
  const matchIndex = normalizedText.indexOf(query);

  if (matchIndex === -1) {
    return text.slice(0, maxLength).trim();
  }

  const previewStart = Math.max(0, matchIndex - 24);
  const previewEnd = Math.min(text.length, matchIndex + query.length + 40);
  const excerpt = text.slice(previewStart, previewEnd).trim();

  const prefix = previewStart > 0 ? '...' : '';
  const suffix = previewEnd < text.length ? '...' : '';

  return `${prefix}${excerpt}${suffix}`;
}

const StarIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" className="text-scarlet">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export default function ChatHub() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [takenCourses, setTakenCourses] = useState<TakenCourse[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMajor, setUserMajor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  
  // MULTI-MODEL STATES
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([DEFAULT_CHAT_MODEL.id]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // TEAMMATE TOOL STATES
  const [debateMode, setDebateMode] = useState(false);
  const [debateModelIds, setDebateModelIds] = useState<string[]>(['mistral', 'gemma']);
  const [debateDepth, setDebateDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [debateThreads, setDebateThreads] = useState<Record<string, DebateThreadView>>({});
  const [activeDebateThreadId, setActiveDebateThreadId] = useState<string | null>(null);
  const [isDebatePanelOpen, setIsDebatePanelOpen] = useState(false);
  const [isDebateFollowUpSending, setIsDebateFollowUpSending] = useState(false);
  const [stepByStepMode, setStepByStepMode] = useState(false);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const [activeThinkingModelId, setActiveThinkingModelId] = useState<string>(DEFAULT_CHAT_MODEL.id);
  const [isStepByStepRequest, setIsStepByStepRequest] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  
  // UI STATES
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  
  // INLINE FOLDER STATES
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [sidebarNewFolderName, setSidebarNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const [sidebarTab, setSidebarTab] = useState<'chats' | 'archived'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const sidebarMenuRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const activeDebateThread = activeDebateThreadId ? debateThreads[activeDebateThreadId] ?? null : null;
  const profileHref = userEmail ? '/profile' : '/login';

  const toggleModelSelection = (id: string) => {
    setSelectedModelIds(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]);
  };

  const mergeTakenCourses = (currentCourses: TakenCourse[], newCourses: TakenCourse[]) => {
    const courseMap = new Map<string, TakenCourse>();
    for (const course of currentCourses) {
      courseMap.set(course.code.toUpperCase(), { ...course, code: course.code.toUpperCase() });
    }
    for (const course of newCourses) {
      courseMap.set(course.code.toUpperCase(), { ...course, code: course.code.toUpperCase() });
    }
    return Array.from(courseMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  };

  // SEARCH FILTER LOGIC
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const getSearchResult = (conversation: Conversation): ConversationSearchResult | null => {
    if (!normalizedSearchQuery) {
      return {
        conversation,
        preview: new Date(conversation.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        matchType: 'title' as const,
        rank: 0,
      };
    }
    const normalizedTitle = conversation.title.toLowerCase();
    const titleIndex = normalizedTitle.indexOf(normalizedSearchQuery);
    if (titleIndex !== -1) {
      return {
        conversation,
        preview: `Title match: ${buildSearchPreview(conversation.title, normalizedSearchQuery, 60)}`,
        matchType: 'title' as const,
        rank: titleIndex,
      };
    }
    const matchingMessage = conversation.messages.find((message) => message.content.toLowerCase().includes(normalizedSearchQuery));
    if (!matchingMessage) return null;
    return {
      conversation,
      preview: buildSearchPreview(matchingMessage.content, normalizedSearchQuery),
      matchType: 'message' as const,
      rank: matchingMessage.content.toLowerCase().indexOf(normalizedSearchQuery) + 1000,
    };
  };

  const filteredConversations: ConversationSearchResult[] = conversations
    .map((conversation) => getSearchResult(conversation))
    .filter((result): result is ConversationSearchResult => result !== null)
    .sort((a, b) => {
      // Pins always float to top
      if (a.conversation.isPinned && !b.conversation.isPinned) return -1;
      if (!a.conversation.isPinned && b.conversation.isPinned) return 1;

      if (normalizedSearchQuery && a.matchType !== b.matchType) {
        return a.matchType === 'title' ? -1 : 1;
      }
      if (normalizedSearchQuery && a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return new Date(b.conversation.updatedAt).getTime() - new Date(a.conversation.updatedAt).getTime();
    });

  const recentConversationResults = filteredConversations.filter(
    ({ conversation }) => !conversation.archived && !conversation.folderId
  );
  const archivedConversationResults = filteredConversations.filter(
    ({ conversation }) => conversation.archived
  );
  const folderConversationResults = folders.map((folder) => ({
    folder,
    results: filteredConversations.filter(
      ({ conversation }) => !conversation.archived && conversation.folderId === folder.id
    ),
  }));
  const hasVisibleChats = recentConversationResults.length > 0 || folderConversationResults.some(({ results }) => results.length > 0);
  const hasVisibleArchivedConversations = archivedConversationResults.length > 0;

  // CLICK AWAY LISTENERS
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
        setFolderMenuOpenId(null);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        setUserEmail(null); setUserName('Guest User'); setUserMajor('Guest'); return;
      }
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
          setUserEmail(user.email ?? null);
          setUserName(user.user_metadata?.full_name || 'Scarlet Knight');
          setUserMajor(user.user_metadata?.major || 'Student');
        } else {
          setUserEmail(null); setUserName('Guest User'); setUserMajor('Guest');
        }
      } catch (authError) {
        setUserEmail(null); setUserName('Guest User'); setUserMajor('Guest'); setError(SUPABASE_ERROR_MESSAGE);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Conversation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((conversation) => ({
            ...conversation,
            archived: Boolean(conversation.archived),
            folderId: conversation.folderId ?? null,
            isPinned: Boolean(conversation.isPinned)
          }));
          const firstActiveConversation = normalized.find((conversation) => !conversation.archived) ?? normalized[0];
          setConversations(normalized);
          setActiveConversationId(firstActiveConversation.id);
          setHasLoadedLocalState(true);
          return;
        }
      } catch (storageError) {
        console.error('Failed to parse saved conversations:', storageError);
      }
    }
    const freshConversation = createUntitledConversation();
    setConversations([freshConversation]);
    setActiveConversationId(freshConversation.id);
    setHasLoadedLocalState(true);
  }, []);

  useEffect(() => {
    const storedFolders = window.localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!storedFolders) {
      setFolders([createDefaultFolder()]);
      return;
    }
    try {
      const parsed = JSON.parse(storedFolders) as ChatFolder[];
      if (Array.isArray(parsed)) {
        const normalizedFolders = parsed.filter((folder) => folder && typeof folder.name === 'string').map((folder) => ({
              id: folder.id,
              name: folder.name,
              createdAt: folder.createdAt ?? new Date().toISOString(),
              collapsed: Boolean(folder.collapsed),
            }));
        const hasMainFolder = normalizedFolders.some((folder) => folder.name.trim().toLowerCase() === DEFAULT_FOLDER_NAME.toLowerCase());
        setFolders(hasMainFolder ? normalizedFolders : [createDefaultFolder(), ...normalizedFolders]);
      }
    } catch (storageError) {
      console.error('Failed to parse saved folders:', storageError);
      setFolders([createDefaultFolder()]);
    }
  }, []);

  useEffect(() => {
    const storedTakenCourses = window.localStorage.getItem(TAKEN_COURSES_STORAGE_KEY);
    if (!storedTakenCourses) return;
    try {
      const parsed = JSON.parse(storedTakenCourses) as TakenCourse[];
      if (Array.isArray(parsed)) {
        setTakenCourses(mergeTakenCourses([], parsed.filter((course) => course && typeof course.code === 'string')));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const storedDebateThreads = window.localStorage.getItem(DEBATE_THREADS_STORAGE_KEY);
    if (!storedDebateThreads) return;
    try {
      const parsed = JSON.parse(storedDebateThreads) as Record<string, DebateThreadView>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setDebateThreads(parsed);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalState) return;
    if (conversations.length === 0) { window.localStorage.removeItem(STORAGE_KEY); return; }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hasLoadedLocalState]);

  useEffect(() => { if (hasLoadedLocalState) window.localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders)); }, [folders, hasLoadedLocalState]);
  useEffect(() => { if (hasLoadedLocalState) window.localStorage.setItem(TAKEN_COURSES_STORAGE_KEY, JSON.stringify(takenCourses)); }, [takenCourses, hasLoadedLocalState]);
  useEffect(() => { if (hasLoadedLocalState) window.localStorage.setItem(DEBATE_THREADS_STORAGE_KEY, JSON.stringify(debateThreads)); }, [debateThreads, hasLoadedLocalState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length, isGenerating]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const lineHeight = 24;
    const maxHeight = lineHeight * 6;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  useEffect(() => {
    if (!isGenerating || !isStepByStepRequest) {
      setThinkingMessageIndex(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setThinkingMessageIndex((current) => (current + 1) % STEP_BY_STEP_THINKING_MESSAGES.length);
    }, 900);
    return () => window.clearInterval(intervalId);
  }, [isGenerating, isStepByStepRequest]);

  const handleNewChat = () => {
    const freshConversation = createUntitledConversation();
    setConversations((current) => [freshConversation, ...current]);
    setActiveConversationId(freshConversation.id);
    setInput('');
    setError(null);
    setEditingId(null);
    setMenuOpenId(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setError(null);
    setMenuOpenId(null);
  };

  const handleUpdateTitle = (id: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle, updatedAt: new Date().toISOString() } : c));
    setEditingId(null);
  };

  const handleTogglePin = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: new Date().toISOString() } : c));
    setMenuOpenId(null);
  };

  const handleDeleteConversation = (conversationId: string) => {
    const conversationToDelete = conversations.find((conversation) => conversation.id === conversationId);
    if (!conversationToDelete) return;

    const shouldDelete = window.confirm(`Are you sure you want to delete "${conversationToDelete.title}"?`);
    if (!shouldDelete) return;

    const remainingConversations = conversations.filter(c => c.id !== conversationId);

    if (remainingConversations.length === 0) {
      const freshConversation = createUntitledConversation();
      setConversations([freshConversation]);
      setActiveConversationId(freshConversation.id);
      setInput('');
      setError(null);
    } else {
      setConversations(remainingConversations);
      if (activeConversationId === conversationId) {
        setActiveConversationId(remainingConversations[0].id);
        setInput('');
        setError(null);
      }
    }
    setMenuOpenId(null);
  };

  const selectFirstAvailableConversation = (excludedId?: string) => {
    const nextConversation = conversations.find((conversation) => conversation.id !== excludedId && !conversation.archived);
    if (nextConversation) { setActiveConversationId(nextConversation.id); return; }
    const freshConversation = createUntitledConversation();
    setConversations((current) => [freshConversation, ...current]);
    setActiveConversationId(freshConversation.id);
  };

  // INLINE FOLDER CREATION
  const handleCreateFolder = (name: string) => {
    const folderName = name.trim();
    if (!folderName) return null;
    const newFolder: ChatFolder = { id: createId('folder'), name: folderName, createdAt: new Date().toISOString(), collapsed: false };
    setFolders((current) => [...current, newFolder]);
    return newFolder;
  };

  // INLINE FOLDER RENAMING
  const handleRenameFolderSubmit = (folderId: string) => {
    if (!editFolderName.trim()) { setEditingFolderId(null); return; }
    setFolders((current) => current.map((item) => (item.id === folderId ? { ...item, name: editFolderName.trim() } : item)));
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;
    const shouldDelete = window.confirm(`Delete "${folder.name}"? Chats in this folder will move back to Recent History.`);
    if (!shouldDelete) return;
    setFolders((current) => current.filter((item) => item.id !== folderId));
    setConversations((current) => current.map((conversation) => conversation.folderId === folderId ? { ...conversation, folderId: null } : conversation));
  };

  const toggleFolderCollapsed = (folderId: string) => {
    setFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, collapsed: !folder.collapsed } : folder));
  };

  const moveConversationToFolder = (conversationId: string, folderId: string | null) => {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, archived: false, folderId, updatedAt: new Date().toISOString() } : conversation));
    setMenuOpenId(null);
    setFolderMenuOpenId(null);
  };

  const handleArchiveConversation = (conversationId: string) => {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, archived: true, updatedAt: new Date().toISOString() } : conversation));
    if (activeConversationId === conversationId) selectFirstAvailableConversation(conversationId);
    setSidebarTab('archived');
    setMenuOpenId(null);
  };

  const handleUnarchiveConversation = (conversationId: string) => {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, archived: false, updatedAt: new Date().toISOString() } : conversation));
    setSidebarTab('chats');
    setMenuOpenId(null);
  };

  const handleDragStart = (e: React.DragEvent, conversationId: string) => {
    e.dataTransfer.setData('text/plain', conversationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropConversation = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const conversationId = e.dataTransfer.getData('text/plain');
    if (!conversationId) return;
    moveConversationToFolder(conversationId, folderId);
  };

  const handleDropArchive = (e: React.DragEvent) => {
    e.preventDefault();
    const conversationId = e.dataTransfer.getData('text/plain');
    if (!conversationId) return;
    handleArchiveConversation(conversationId);
  };

  const handleForgetTakenCourse = (courseCode: string) => {
    setTakenCourses((current) => current.filter((course) => course.code !== courseCode));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || !activeConversation || isGenerating) return;

    const userMessage: Message = { role: 'user', content: trimmedInput };
    const updatedConversation: Conversation = {
      ...activeConversation,
      title: activeConversation.messages.length === 0 ? deriveTitle(trimmedInput) : activeConversation.title,
      updatedAt: new Date().toISOString(),
      messages: [...activeConversation.messages, userMessage],
    };

    setConversations((current) =>
      current.map((conversation) => conversation.id === activeConversation.id ? updatedConversation : conversation).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
    setInput('');
    setError(null);
    setIsGenerating(true);

    const mathRequestDetected = detectMathReasoningRequest(trimmedInput, stepByStepMode);
    const resolvedModelId = resolveChatModelId(selectedModelIds[0], { stepByStepMode, isMathRequest: mathRequestDetected });
    const usesStepByStepFlow = stepByStepMode || mathRequestDetected;
    const rutgersLoadingState = getRutgersLoadingState(trimmedInput);
    
    setActiveThinkingModelId(resolvedModelId);
    setIsStepByStepRequest(usesStepByStepFlow);
    setThinkingMessageIndex(0);
    setLoadingTitle(rutgersLoadingState?.title ?? null);
    setLoadingDetail(rutgersLoadingState?.detail ?? null);
    
    const newlyTakenCourses = extractRutgersTakenCourses(trimmedInput);
    const nextTakenCourses = newlyTakenCourses.length > 0 ? mergeTakenCourses(takenCourses, newlyTakenCourses) : takenCourses;
    if (newlyTakenCourses.length > 0) setTakenCourses(nextTakenCourses);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          conversationId: activeConversation.id,
          messages: updatedConversation.messages,
          modelIds: selectedModelIds, // Multi-LLM Array
          stepByStepMode,
          userName,
          takenCourses: nextTakenCourses,
          debateMode,
          debateModelIds,
          debateDepth,
        }),
      });

      const data = await response.json();
      if (!response.ok || (!data.content && !data.responses)) throw new Error(data.error || 'Scarlet AI could not generate a response.');

      const returnedDebateThread = data.debateThread as DebateThreadView | null | undefined;
      if (returnedDebateThread) {
        setDebateThreads((current) => ({ ...current, [returnedDebateThread.id]: returnedDebateThread }));
        setActiveDebateThreadId(returnedDebateThread.id);
        setIsDebatePanelOpen(true);
      }

      // Multi-LLM Parsing
      const assistantMessage: Message = {
        role: 'assistant',
        content: returnedDebateThread ? `Debate started: ${returnedDebateThread.originalQuestion}` : data.content || '',
        comparisonResponses: data.responses,
        debateThreadId: returnedDebateThread?.id,
      };

        setConversations((current) =>
          current.map((conversation) => {
            if (conversation.id !== activeConversation.id) return conversation;
            return { ...conversation, updatedAt: new Date().toISOString(), messages: [...updatedConversation.messages, assistantMessage] };
          }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        );
      } else {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmedInput, conversationId: activeConversation.id, messages: cleanMessages, modelId: selectedModelId, userName }),
        });

        const data = await response.json();
        if (!response.ok || !data.content) throw new Error(data.error || 'Scarlet AI could not generate a response.');

        const assistantModel = getChatModelOption(data.modelId ?? selectedModelId);
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.content,
          durationMs: data.durationMs,
          modelId: data.modelId ?? assistantModel.id,
          modelLabel: data.modelLabel ?? assistantModel.label,
          modelDescription: data.modelDescription ?? assistantModel.description,
        };

        setConversations((current) =>
          current.map((conversation) => {
            if (conversation.id !== activeConversation.id) return conversation;
            return { ...conversation, id: data.conversationId || conversation.id, updatedAt: new Date().toISOString(), messages: [...updatedConversation.messages, assistantMessage] };
          }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        );
        if (data.conversationId) setActiveConversationId(data.conversationId);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send your message.');
    } finally {
      setIsGenerating(false);
      setIsStepByStepRequest(false);
      setThinkingMessageIndex(0);
      setLoadingTitle(null);
      setLoadingDetail(null);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || !activeConversation || isGenerating) return;
      void handleSendMessage(e);
    }
  };

  const handleDebateFollowUp = async (message: string) => {
    if (!activeDebateThread || isDebateFollowUpSending) return;

    setIsDebateFollowUpSending(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          modelIds: selectedModelIds,
          debateFollowUp: true,
          debateThread: activeDebateThread,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.debateThread) throw new Error(data.error || 'Scarlet AI could not continue the debate.');

      const updatedThread = data.debateThread as DebateThreadView;
      setDebateThreads((current) => ({ ...current, [updatedThread.id]: updatedThread }));
      setActiveDebateThreadId(updatedThread.id);
      setIsDebatePanelOpen(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue the debate.');
    } finally {
      setIsDebateFollowUpSending(false);
    }
  };

  const renderConversationCard = (result: ConversationSearchResult, options: { archived?: boolean } = {}) => {
    const { conversation, preview, matchType } = result;

    return (
      <div
        key={conversation.id}
        draggable
        onDragStart={(e) => handleDragStart(e, conversation.id)}
        className={`rounded-xl border transition-all relative ${
          conversation.id === activeConversationId
            ? 'bg-[var(--surface-soft)] border-scarlet/20 shadow-[0_8px_18px_rgba(15,23,42,0.06)]'
            : 'bg-transparent border-transparent hover:bg-[var(--surface-soft)] hover:border-[var(--card-border)] hover:shadow-[0_6px_14px_rgba(15,23,42,0.04)]'
        }`}
      >
        <div className="flex items-start gap-3 px-3 py-3 group">
          <button onClick={() => handleSelectConversation(conversation.id)} className="min-w-0 flex-1 text-left flex items-start gap-2">
            {/* PIN ICON */}
            {conversation.isPinned && <div className="mt-1"><StarIcon filled /></div>}
            
            {editingId === conversation.id ? (
              <input autoFocus className="w-full bg-transparent border-b border-scarlet outline-none text-sm font-semibold text-[var(--text-primary)]" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => handleUpdateTitle(conversation.id)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle(conversation.id)} />
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">{conversation.title}</p>
                {normalizedSearchQuery ? (
                  <div className="mt-1">
                    <p className="text-[10px] text-scarlet font-black uppercase tracking-widest">{matchType === 'title' ? 'Title' : 'Conversation'}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">{preview}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 font-bold uppercase">{preview}</p>
                )}
              </div>
            )}
          </button>

          <button aria-label={`More options for ${conversation.title}`} onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conversation.id ? null : conversation.id); setFolderMenuOpenId(null); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--card-bg)] rounded text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>

          {/* BEAUTIFUL INLINE FOLDER MENU */}
          {folderMenuOpenId === conversation.id && (
              <div ref={sidebarMenuRef} className="absolute right-2 top-10 w-56 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl z-[60] py-3 px-3 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">Move to Folder</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    <button onClick={() => moveConversationToFolder(conversation.id, null)} className="w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-[var(--surface-soft)] rounded-md text-[var(--text-secondary)] italic">Remove from folder</button>
                    {folders.map(f => (
                        <button key={f.id} onClick={() => moveConversationToFolder(conversation.id, f.id)} className="w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-[var(--surface-soft)] rounded-md truncate text-[var(--text-primary)] flex items-center justify-between">
                          {f.name}
                          {conversation.folderId === f.id && <div className="w-1.5 h-1.5 rounded-full bg-scarlet" />}
                        </button>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex gap-2">
                      <input autoFocus placeholder="New folder..." className="flex-1 min-w-0 bg-[var(--surface-soft)] border border-[var(--input-border)] outline-none rounded-lg px-3 py-1.5 text-xs font-bold focus:border-scarlet transition-colors" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) { const newF = handleCreateFolder(newFolderName); if (newF) moveConversationToFolder(conversation.id, newF.id); setNewFolderName(''); } }} />
                      <button onClick={() => { if(newFolderName.trim()) { const newF = handleCreateFolder(newFolderName); if (newF) moveConversationToFolder(conversation.id, newF.id); setNewFolderName(''); } }} disabled={!newFolderName.trim()} className="bg-[var(--text-primary)] text-[var(--card-bg)] px-3 rounded-lg font-black text-xs hover:opacity-80 disabled:opacity-30">+</button>
                  </div>
              </div>
          )}

          {/* MAIN 3-DOT MENU */}
          {menuOpenId === conversation.id && !folderMenuOpenId && (
            <div ref={sidebarMenuRef} className="absolute right-2 top-10 w-44 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl z-[60] py-1 overflow-hidden animate-in fade-in zoom-in duration-100">
              <button onClick={() => { setEditingId(conversation.id); setEditTitle(conversation.title); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Rename</button>
              <button onClick={() => handleTogglePin(conversation.id)} className="w-full text-left px-4 py-2 text-xs font-black hover:bg-[var(--surface-soft)] flex items-center gap-3 text-scarlet"><StarIcon filled={conversation.isPinned} />{conversation.isPinned ? 'Unpin' : 'Pin to Top'}</button>
              <button onClick={(e) => { e.stopPropagation(); setFolderMenuOpenId(conversation.id); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h4"/></svg>Move to folder</button>
              {options.archived ? (
                <button onClick={() => handleUnarchiveConversation(conversation.id)} className="w-full text-left px-4 py-2 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 12 11 15 14"/><path d="M12 11v8"/><path d="M20.5 10.5V20a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9.5"/><path d="M2 6h20l-2 4H4z"/></svg>Unarchive</button>
              ) : (
                <button onClick={() => handleArchiveConversation(conversation.id)} className="w-full text-left px-4 py-2 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>Archive</button>
              )}
              <button onClick={() => handleDeleteConversation(conversation.id)} className="w-full text-left px-4 py-2 text-xs font-black text-red-400 hover:bg-[rgba(204,0,51,0.08)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)] transition-colors">
      {/* SIDEBAR */}
      <aside className={`h-screen bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] shadow-[6px_0_24px_rgba(15,23,42,0.05)] flex flex-col p-4 relative z-50 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-20 items-center'}`}>
        <div className={isSidebarOpen ? "w-72" : "w-12 flex flex-col items-center"}>
          <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
            <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
            {isSidebarOpen && <span className="font-black text-xl tracking-tight uppercase">SCARLET <span className="text-scarlet">AI</span></span>}
          </Link>

          {isSidebarOpen && (
              <>
                <button onClick={handleNewChat} className="w-full py-3 mb-4 border-2 border-dashed border-[var(--input-border)] rounded-xl text-[var(--text-secondary)] font-bold hover:border-scarlet hover:text-scarlet transition-all">+ New Chat</button>

                <div className="relative mb-6">
                   <div className="flex items-center bg-[var(--surface-soft)] border border-[var(--input-border)] rounded-xl px-3 w-full shadow-[0_6px_16px_rgba(15,23,42,0.04)] focus-within:shadow-sm focus-within:ring-1 focus-within:ring-[#cc0033]/20">
                      <span className="p-1 text-[var(--text-muted)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                      <input placeholder="Search chats..." className="bg-transparent border-none outline-none text-xs font-bold w-full ml-2 py-2 text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                   </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] p-1">
                        <button onClick={() => setSidebarTab('chats')} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${sidebarTab === 'chats' ? 'bg-[var(--card-bg)] text-scarlet shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Chats</button>
                        <button onClick={() => setSidebarTab('archived')} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${sidebarTab === 'archived' ? 'bg-[var(--card-bg)] text-scarlet shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Archived</button>
                    </div>

                    {/* INLINE FOLDER CREATION HEADER */}
                    <div className="mb-3 flex items-center justify-between px-2">
                        <p className="font-bold uppercase tracking-widest text-[10px] text-[var(--text-muted)]">{sidebarTab === 'chats' ? 'Folders' : 'Archived Chats'}</p>
                        {sidebarTab === 'chats' && (
                            <div className="flex items-center">
                              {isCreatingFolder ? (
                                <div className="flex items-center bg-[var(--surface-soft)] border border-[var(--input-border)] rounded px-1.5 py-1">
                                  <input autoFocus placeholder="Name..." className="bg-transparent outline-none text-[10px] w-20 text-[var(--text-primary)]" value={sidebarNewFolderName} onChange={e => setSidebarNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && sidebarNewFolderName.trim()) { handleCreateFolder(sidebarNewFolderName); setIsCreatingFolder(false); setSidebarNewFolderName(''); } else if (e.key === 'Escape') setIsCreatingFolder(false); }} />
                                  <button onClick={() => { if(sidebarNewFolderName.trim()) handleCreateFolder(sidebarNewFolderName); setIsCreatingFolder(false); setSidebarNewFolderName(''); }} className="text-scarlet font-black text-[10px] ml-1">+</button>
                                </div>
                              ) : (
                                <button aria-label="Create folder" title="Create folder" onClick={() => setIsCreatingFolder(true)} className="opacity-60 hover:opacity-100 rounded-lg p-1 text-[var(--text-muted)] hover:text-scarlet hover:bg-[var(--surface-soft)] transition-all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></button>
                              )}
                            </div>
                        )}
                    </div>

                    <div className="h-[calc(100vh-430px)] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                        {sidebarTab === 'chats' ? (
                            <>
                                {!hasVisibleChats && <div className="text-sm text-[var(--text-secondary)] italic px-2">No results found.</div>}

                                <section onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropConversation(e, null)} className="space-y-2">
                                    <p className="px-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Recent History</p>
                                    {recentConversationResults.map((result) => renderConversationCard(result))}
                                </section>

                                {/* INLINE FOLDER RENAMING UI */}
                                {folderConversationResults.map(({ folder, results }) => (
                                    <section key={folder.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropConversation(e, folder.id)} className="rounded-xl border border-transparent hover:border-[var(--card-border)]">
                                        <div className="group flex items-center gap-2 px-2 py-1.5">
                                            <button onClick={() => toggleFolderCollapsed(folder.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                                <svg className={`transition-transform ${folder.collapsed ? '-rotate-90' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                                {editingFolderId === folder.id ? (
                                                  <input autoFocus className="bg-transparent border-b border-scarlet outline-none text-[10px] text-[var(--text-primary)] w-24" value={editFolderName} onChange={e => setEditFolderName(e.target.value)} onBlur={() => handleRenameFolderSubmit(folder.id)} onKeyDown={e => e.key === 'Enter' && handleRenameFolderSubmit(folder.id)} onClick={e => e.stopPropagation()} />
                                                ) : (
                                                  <span className="truncate">{folder.name}</span>
                                                )}
                                                <span className="text-[9px] opacity-60">{results.length}</span>
                                            </button>
                                            <button onClick={() => { setEditingFolderId(folder.id); setEditFolderName(folder.name); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-scarlet hover:bg-[var(--surface-soft)]"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                                            <button onClick={() => handleDeleteFolder(folder.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-[rgba(204,0,51,0.08)]"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
                                        </div>
                                        {!folder.collapsed && (
                                            <div className="space-y-2">
                                                {results.length > 0 ? results.map((result) => renderConversationCard(result)) : <p className="px-2 pb-2 text-[11px] italic text-[var(--text-muted)]">Drop chats here.</p>}
                                            </div>
                                        )}
                                    </section>
                                ))}
                            </>
                        ) : (
                            <section onDragOver={(e) => e.preventDefault()} onDrop={handleDropArchive} className="space-y-2">
                                {hasVisibleArchivedConversations ? archivedConversationResults.map((result) => renderConversationCard(result, { archived: true })) : <p className="px-2 text-[11px] italic text-[var(--text-muted)]">No archived chats.</p>}
                            </section>
                        )}
                    </div>
                </div>
              </>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--card-border)] w-full flex justify-center">
            {userEmail ? <LogoutButton /> : <Link href="/login" className="text-scarlet font-bold block text-center p-3 text-xs uppercase tracking-widest">Login</Link>}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col relative z-10">
        <header className="flex items-center justify-between px-6 py-4 bg-[var(--card-bg)] border-b border-[var(--card-border)] shadow-[0_10px_30px_rgba(15,23,42,0.04)] sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[var(--surface-soft)] rounded-lg text-[var(--text-muted)] transition-colors hidden md:block">
            {isSidebarOpen ? '❮' : '❯'}
          </button>
          <button onClick={handleNewChat} className="md:hidden bg-[var(--surface-soft)] text-[var(--text-secondary)] px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
            New Chat
          </button>

          {/* ACTIVE CHAT TITLE WITH PIN STAR */}
          <h1 className="absolute left-1/2 -translate-x-1/2 font-black tracking-widest text-[var(--text-primary)] text-xs sm:text-sm text-center flex items-center gap-2">
            {activeConversation?.isPinned && <StarIcon filled />}
            {activeConversation?.title || "New Session"}
          </h1>

          <div className="flex justify-end">
            <Link href={profileHref} className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-[var(--text-primary)] leading-none group-hover:text-scarlet transition-colors uppercase">{userName}</p>
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">{userMajor}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[var(--surface-soft)] border border-[var(--card-border)] group-hover:border-scarlet flex items-center justify-center overflow-hidden transition-colors">
                <Image src="/websiteicon.png" alt="Profile" width={20} height={20} className="opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[var(--app-bg)]">
          {activeConversation && activeConversation.messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <Image src="/overlayicon.png" alt="Logo" width={100} height={100} />
              <h2 className="text-2xl font-black mt-4 uppercase tracking-tighter italic">
                How can I help you, {userName?.split(' ')[0] || 'Scarlet Knight'}?
              </h2>
              <p className="max-w-xl mt-3 text-sm text-[var(--text-secondary)] font-medium">
                Ask about Rutgers life, software engineering, study support, or general questions.
              </p>
            </div>
          )}

          {activeConversation?.messages.map((msg, i) => {
            // MULTI-LLM GRID RENDERER
            const isMultiResponse = msg.role === 'assistant' && msg.comparisonResponses && msg.comparisonResponses.length > 1;
            const hasSingleResponse = msg.role === 'assistant' && msg.comparisonResponses && msg.comparisonResponses.length === 1;

            return (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex-shrink-0 flex items-center justify-center bg-[var(--card-bg)] shadow-sm">
                    <Image src="/overlayicon.png" alt="AI" width={18} height={18} />
                  </div>
                )}
                <div className={`${isMultiResponse ? 'w-full' : 'max-w-[85%] sm:max-w-[75%]'} ${msg.role === 'user' ? 'items-end flex flex-col' : 'items-start'}`}>
                    {isMultiResponse ? (
                      <div className={`grid gap-4 w-full ${msg.comparisonResponses!.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                        {msg.comparisonResponses!.map((res, idx) => (
                          <div key={idx} className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl p-5 shadow-sm flex flex-col h-full border-t-scarlet">
                             <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--card-border)]">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-scarlet uppercase tracking-widest">{res.modelLabel}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] font-bold">{res.durationMs}ms</span>
                                </div>
                             </div>
                             <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap flex-1 text-[var(--text-primary)]">{res.content}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {msg.role === 'assistant' && !msg.debateThreadId && !hasSingleResponse && (
                          <div className="mb-1 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            <span>{msg.modelLabel ?? getChatModelOption(msg.modelId).label}</span>
                            {typeof msg.durationMs === 'number' && <span className="opacity-70">{Math.round(msg.durationMs / 1000)}s</span>}
                          </div>
                        )}
                        <div
                          data-testid={msg.role === 'user' ? 'user-message' : 'assistant-message'}
                          className={`p-4 rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.06)] font-medium whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)] border border-[var(--user-bubble-border)] rounded-tr-none' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-tl-none'}`}
                        >
                          {msg.debateThreadId && debateThreads[msg.debateThreadId] ? (
                            <div data-testid="debate-started-card" className="whitespace-normal">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-scarlet">Debate started</p>
                              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--text-primary)]">{debateThreads[msg.debateThreadId].originalQuestion}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Context: {debateThreads[msg.debateThreadId].contextUsed}</span>
                                <button type="button" onClick={() => { setActiveDebateThreadId(msg.debateThreadId ?? null); setIsDebatePanelOpen(true); }} className="rounded-full bg-scarlet px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#990026]">Open Debate</button>
                              </div>
                            </div>
                          ) : hasSingleResponse ? (
                            <>
                               <div className="mb-2 pb-2 border-b border-[var(--card-border)] flex items-center gap-2">
                                  <span className="text-[10px] font-black text-scarlet uppercase tracking-widest">{msg.comparisonResponses![0].modelLabel}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] font-bold">({msg.comparisonResponses![0].durationMs}ms)</span>
                               </div>
                               {msg.comparisonResponses![0].content}
                            </>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </>
                    )}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            isCompareMode ? (
              <div className="grid grid-cols-2 gap-4">
                {[selectedModelId, secondModelId].map((modelId) => (
                  <div key={modelId} className="flex items-start gap-3">
                    <div className="relative w-9 h-9 flex-shrink-0">
                      <div className="absolute inset-0 rounded-full border-2 border-t-scarlet border-transparent animate-spin" />
                      <div className="w-full h-full rounded-full border border-[var(--card-border)] flex items-center justify-center bg-[var(--card-bg)]">
                        <Image src="/overlayicon.png" alt="AI" width={18} height={18} className="opacity-50" />
                      </div>
                    </div>
                    <div className="bg-[var(--surface-soft)] border border-[var(--card-border)] p-5 rounded-2xl rounded-tl-none shadow-[0_10px_24px_rgba(15,23,42,0.06)] flex flex-col gap-2 min-w-[140px]">
                      <div className="flex gap-1.5 items-center">
                        <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">
                        {`Thinking with ${getChatModelOption(modelId).label}...`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div data-testid="thinking-state" className="bg-[var(--surface-soft)] border border-[var(--card-border)] p-5 rounded-2xl rounded-tl-none shadow-[0_10px_24px_rgba(15,23,42,0.06)] flex flex-col gap-2 min-w-[220px]">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">
                  {loadingTitle ?? `Thinking with ${selectedModelIds.length} models...`}
                </span>
                {loadingDetail ? (
                  <p data-testid="loading-phase" className="text-sm font-semibold text-[var(--text-primary)]">{loadingDetail}</p>
                ) : isStepByStepRequest && (
                  <p data-testid="thinking-phase" className="text-sm font-semibold text-[var(--text-primary)]">{STEP_BY_STEP_THINKING_MESSAGES[thinkingMessageIndex]}</p>
                )}
              </div>
            )
          )}

          {error && <div className="max-w-xl rounded-2xl border border-[var(--message-error-border)] bg-[var(--message-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--message-error-text)]">{error}</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* ACTION BAR FOOTER */}
        <div className="p-6 bg-[var(--app-bg)] border-t border-[var(--card-border)]">
          <div className="max-w-4xl mx-auto relative">
            
            {/* MULTI-MODEL CUSTOM DROPDOWN */}
            {isModelMenuOpen && (
              <div ref={modelMenuRef} className="absolute bottom-full right-0 mb-4 w-64 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl p-4 z-[100] animate-in slide-in-from-bottom-2">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">Select Backends</p>
                <div className="space-y-1">
                  {CHAT_MODEL_OPTIONS.map(model => (
                    <button key={model.id} onClick={() => toggleModelSelection(model.id)} className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${selectedModelIds.includes(model.id) ? 'bg-scarlet/10 text-scarlet' : 'hover:bg-[var(--surface-soft)] text-[var(--text-secondary)]'}`}>
                      <span className="text-xs font-bold">{model.label}</span>
                      {selectedModelIds.includes(model.id) && <div className="w-2 h-2 bg-scarlet rounded-full shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-2xl focus-within:border-scarlet transition-all shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <textarea
                ref={composerRef}
                placeholder={`Hello ${userName?.split(' ')[0] || 'there'}, ask Scarlet AI anything...`}
                className="w-full min-h-[64px] max-h-[144px] resize-none overflow-y-hidden p-5 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--input-placeholder)] font-medium leading-6"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                maxLength={2000}
                rows={1}
              />
              
              <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-[var(--input-border)] gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                   <button type="button" className="p-2 text-[var(--text-muted)] hover:text-scarlet transition-colors">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                   </button>
                   <button
                     type="button"
                     aria-label="Step-by-Step Mode"
                     aria-pressed={stepByStepMode}
                     data-testid="step-by-step-toggle"
                     onClick={() => setStepByStepMode((current) => !current)}
                     className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors ${
                       stepByStepMode
                         ? 'border-scarlet/40 bg-[rgba(204,0,51,0.08)] text-scarlet'
                         : 'border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]'
                     }`}
                   >
                     <span className="flex flex-col text-left leading-tight">
                       <span className="text-[10px] font-black uppercase tracking-widest">Step-by-Step Mode</span>
                       <span className="text-[10px] font-semibold normal-case opacity-80">
                         {stepByStepMode ? 'In use for math reasoning' : 'Click to use for math reasoning'}
                       </span>
                     </span>
                   </button>
                   <DebateModeToggle enabled={debateMode} onChange={setDebateMode} />
                </div>

                <div className="flex items-center gap-4">
                   <button onClick={() => setIsModelMenuOpen(!isModelMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-soft)] hover:bg-scarlet/10 rounded-lg transition-all border border-[var(--card-border)] shadow-sm">
                      <div className="flex -space-x-2">
                         {selectedModelIds.slice(0, 3).map(id => (<div key={id} className="w-4 h-4 rounded-full bg-scarlet border border-white flex items-center justify-center text-[8px] text-white font-bold">{id[0].toUpperCase()}</div>))}
                      </div>
                      <span className="text-[10px] font-black uppercase text-scarlet tracking-tighter">{selectedModelIds.length > 1 ? `Models (${selectedModelIds.length})` : getChatModelOption(selectedModelIds[0]).label}</span>
                   </button>
                   
                   <button
                      type="submit"
                      onClick={handleSendMessage}
                      disabled={isGenerating || !activeConversation || !input.trim()}
                      className="bg-[#cc0033] text-white px-5 h-9 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#990026] shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                      {isGenerating ? 'Wait' : 'Send'}
                  </button>
                </div>
              </div>
              <ModelDebatePanel
                enabled={debateMode}
                models={CHAT_MODEL_OPTIONS}
                selectedModelIds={debateModelIds}
                debateDepth={debateDepth}
                onChange={setDebateModelIds}
                onDepthChange={setDebateDepth}
              />
            </div>
            
            <div className="mt-4 flex flex-col items-center gap-1">
               <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] text-center">
                 {getChatModelOption(selectedModelIds[0]).description}
               </p>
               <p className="text-[9px] font-bold text-[var(--text-muted)] text-center uppercase tracking-[0.16em]">
                 {stepByStepMode
                   ? 'Step-by-Step Mode is on. The selected models will break down the math.'
                   : 'Select multiple models to trigger the side-by-side comparison grid.'}
               </p>
               {takenCourses.length > 0 && (
                 <div className="mt-2 flex max-w-4xl flex-wrap items-center justify-center gap-2">
                   <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                     Remembered completed courses
                   </span>
                   {takenCourses.map((course) => (
                     <button
                       key={course.code}
                       type="button"
                       title={`Forget ${course.code}`}
                       onClick={() => handleForgetTakenCourse(course.code)}
                       className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)] hover:border-scarlet hover:text-scarlet"
                     >
                       {course.code} x
                     </button>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
        <DebateThreadPanel
          thread={activeDebateThread}
          open={isDebatePanelOpen}
          isSending={isDebateFollowUpSending}
          onClose={() => setIsDebatePanelOpen(false)}
          onFollowUp={handleDebateFollowUp}
        />
      </main>
    </div>
  );
}