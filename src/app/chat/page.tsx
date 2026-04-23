'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL, getChatModelOption } from '@/lib/chat-models';
import { supabase, SUPABASE_ERROR_MESSAGE } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  durationMs?: number;
  modelId?: string;
  modelLabel?: string;
  modelDescription?: string;
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
  isArchived?: boolean;
  isPinned?: boolean;
  folder?: string;
};

type ConversationSearchResult = {
  conversation: Conversation;
  preview: string;
  matchType: 'title' | 'message';
  rank: number;
};

const STORAGE_KEY = 'scarlet-ai-conversations';

function createUntitledConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `conversation-${Date.now()}`,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
    isArchived: false,
    isPinned: false,
    folder: '',
  };
}

function deriveTitle(message: string) {
  return message.trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 48) || 'New chat';
}

function buildSearchPreview(text: string, query: string, maxLength = 80) {
  const normalizedText = text.toLowerCase();
  const matchIndex = normalizedText.indexOf(query);
  if (matchIndex === -1) return text.slice(0, maxLength).trim();
  const previewStart = Math.max(0, matchIndex - 24);
  const previewEnd = Math.min(text.length, matchIndex + query.length + 40);
  const excerpt = text.slice(previewStart, previewEnd).trim();
  return `${previewStart > 0 ? '...' : ''}${excerpt}${previewEnd < text.length ? '...' : ''}`;
}

// Clean SVG Icons for professional UI
const StarIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" className="text-scarlet">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function ChatHub() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMajor, setUserMajor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([DEFAULT_CHAT_MODEL.id]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // FOLDER & MENU STATES
  const [viewArchived, setViewArchived] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<{msgIndex: number, modelId: string} | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const sidebarMenuRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const profileHref = userEmail ? '/profile' : '/login';

  const toggleModelSelection = (id: string) => setSelectedModelIds(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]);
  const toggleFolderCollapse = (folderName: string) => setCollapsedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));

  // Dynamic list of unique folders created by the user
  const existingFolders = Array.from(new Set(conversations.map(c => c.folder).filter(Boolean))) as string[];

  // --- FILTER LOGIC ---
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const folderFilteredConversations = conversations.filter(c => viewArchived ? c.isArchived : !c.isArchived);

  const searchResults: ConversationSearchResult[] = folderFilteredConversations
    .map((conversation) => {
      if (!normalizedSearchQuery) return { conversation, preview: new Date(conversation.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }), matchType: 'title' as const, rank: 0 };
      const titleIndex = conversation.title.toLowerCase().indexOf(normalizedSearchQuery);
      if (titleIndex !== -1) return { conversation, preview: `Title match: ${buildSearchPreview(conversation.title, normalizedSearchQuery, 60)}`, matchType: 'title' as const, rank: titleIndex };
      const matchingMessage = conversation.messages.find((m) => m.content.toLowerCase().includes(normalizedSearchQuery));
      if (!matchingMessage) return null;
      return { conversation, preview: buildSearchPreview(matchingMessage.content, normalizedSearchQuery), matchType: 'message' as const, rank: matchingMessage.content.toLowerCase().indexOf(normalizedSearchQuery) + 1000 };
    })
    .filter((result): result is ConversationSearchResult => result !== null)
    .sort((a, b) => {
      if (normalizedSearchQuery && a.matchType !== b.matchType) return a.matchType === 'title' ? -1 : 1;
      if (normalizedSearchQuery && a.rank !== b.rank) return a.rank - b.rank;
      return new Date(b.conversation.updatedAt).getTime() - new Date(a.conversation.updatedAt).getTime();
    });

  const pinnedChats = searchResults.filter(r => r.conversation.isPinned);
  const unpinnedChats = searchResults.filter(r => !r.conversation.isPinned);
  
  const groupedFolders = unpinnedChats.reduce((acc, curr) => {
    const folderName = curr.conversation.folder || 'Recent History';
    if (!acc[folderName]) acc[folderName] = [];
    acc[folderName].push(curr);
    return acc;
  }, {} as Record<string, ConversationSearchResult[]>);

  const folderKeys = Object.keys(groupedFolders).sort((a, b) => {
    if (a === 'Recent History') return -1;
    if (b === 'Recent History') return 1;
    return a.localeCompare(b);
  });

  // --- USE EFFECTS ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
        setFolderMenuOpenId(null);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) setIsModelMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) { setUserEmail(null); setUserName('Guest User'); setUserMajor('Guest'); return; }
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) { setUserEmail(user.email ?? null); setUserName(user.user_metadata?.full_name || 'Scarlet Knight'); setUserMajor(user.user_metadata?.major || 'Student'); } 
        else { setUserEmail(null); setUserName('Guest User'); setUserMajor('Guest'); }
      } catch (authError) { setUserEmail(null); setUserName('Guest User'); setUserMajor('Guest'); setError(SUPABASE_ERROR_MESSAGE); }
    };
    getUser();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Conversation[];
        if (Array.isArray(parsed) && parsed.length > 0) { setConversations(parsed); setActiveConversationId(parsed[0].id); setHasLoadedLocalState(true); return; }
      } catch (e) {}
    }
    const fresh = createUntitledConversation();
    setConversations([fresh]); setActiveConversationId(fresh.id); setHasLoadedLocalState(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalState) return;
    if (conversations.length === 0) { window.localStorage.removeItem(STORAGE_KEY); return; }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hasLoadedLocalState]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeConversation?.messages.length, isGenerating]);
  
  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 144 ? 'auto' : 'hidden';
  }, [input]);

  // --- ACTIONS ---
  const handleNewChat = () => {
    const fresh = createUntitledConversation();
    setConversations((current) => [fresh, ...current]);
    setActiveConversationId(fresh.id); setInput(''); setError(null); setEditingId(null); setMenuOpenId(null); setViewArchived(false);
  };

  const handleSelectConversation = (id: string) => { setActiveConversationId(id); setError(null); setMenuOpenId(null); setFolderMenuOpenId(null); };

  const handleUpdateTitle = (id: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle, updatedAt: new Date().toISOString() } : c));
    setEditingId(null);
  };

  const handleToggleArchive = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isArchived: !c.isArchived, updatedAt: new Date().toISOString() } : c));
    setMenuOpenId(null);
    if (id === activeConversationId && !viewArchived) {
      const remainingActive = conversations.filter(c => c.id !== id && !c.isArchived);
      if (remainingActive.length > 0) setActiveConversationId(remainingActive[0].id);
      else handleNewChat();
    }
  };

  const handleTogglePin = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: new Date().toISOString() } : c));
    setMenuOpenId(null);
  };

  const handleSetFolder = (id: string, folderName: string) => {
    if (folderName.trim() !== '') {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, folder: folderName.trim(), updatedAt: new Date().toISOString() } : c));
    } else {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, folder: '', updatedAt: new Date().toISOString() } : c));
    }
    setFolderMenuOpenId(null);
    setNewFolderName('');
  };

  const handleDeleteConversation = (id: string) => {
    const chat = conversations.find(c => c.id === id);
    if (!chat || !window.confirm(`Delete "${chat.title}"?`)) return;
    const remaining = conversations.filter(c => c.id !== id);
    if (remaining.length === 0) { handleNewChat(); } else {
      setConversations(remaining);
      if (activeConversationId === id) setActiveConversationId(remaining[0].id);
    }
    setMenuOpenId(null);
  };

  const handleRegenerateSingleModel = async (messageIndex: number, targetModelId: string) => {
    if (!activeConversation) return;
    const userPromptIndex = messageIndex - 1;
    if (userPromptIndex < 0 || activeConversation.messages[userPromptIndex].role !== 'user') return;
    const userPrompt = activeConversation.messages[userPromptIndex].content;

    setIsRegenerating({ msgIndex: messageIndex, modelId: targetModelId });
    const historyForApi = activeConversation.messages.slice(0, userPromptIndex + 1);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userPrompt, conversationId: activeConversation.id, messages: historyForApi.slice(0, -1), modelIds: [targetModelId], userName }),
      });

      const data = await response.json();
      if (!response.ok || !data.responses) throw new Error(data.error || 'Regeneration failed.');
      const newResponse = data.responses[0];

      setConversations(current => current.map(conv => {
        if (conv.id !== activeConversation.id) return conv;
        const updatedMessages = [...conv.messages];
        const targetMessage = { ...updatedMessages[messageIndex] };
        if (targetMessage.comparisonResponses) {
          targetMessage.comparisonResponses = targetMessage.comparisonResponses.map(res => res.modelId === targetModelId ? newResponse : res);
        }
        updatedMessages[messageIndex] = targetMessage;
        return { ...conv, updatedAt: new Date().toISOString(), messages: updatedMessages };
      }));
    } catch (err) { console.error(err); setError('Failed to regenerate specific model response.'); } 
    finally { setIsRegenerating(null); }
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

    setConversations((current) => current.map((c) => c.id === activeConversation.id ? updatedConversation : c).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setInput(''); setError(null); setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedInput, conversationId: activeConversation.id, messages: updatedConversation.messages, modelIds: selectedModelIds, userName }),
      });

      const data = await response.json();
      if (!response.ok || !data.responses) throw new Error(data.error || 'Comparison failed.');

      const assistantMessage: Message = { role: 'assistant', content: data.responses[0].content, comparisonResponses: data.responses };

      setConversations((current) =>
        current.map((c) => {
          if (c.id !== activeConversation.id) return c;
          return { ...c, id: data.conversationId || c.id, updatedAt: new Date().toISOString(), messages: [...updatedConversation.messages, assistantMessage] };
        }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      );
      if (data.conversationId) setActiveConversationId(data.conversationId);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send your message.'); } 
    finally { setIsGenerating(false); }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!input.trim() || !activeConversation || isGenerating) return; void handleSendMessage(e); }
  };

  const userFirstName = userName?.split(' ')[0] || 'there';
  const selectedModelLabels = selectedModelIds.map(id => getChatModelOption(id).label).join(', ');

  // UI COMPONENT: Chat Item with Inline Menus and Folder Context
  const ChatListItem = ({ result }: { result: ConversationSearchResult }) => {
    const { conversation, preview } = result;
    return (
      <div className={`rounded-xl border transition-all relative group ${conversation.id === activeConversationId ? 'bg-[var(--surface-soft)] border-scarlet/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-[var(--surface-soft)]'}`}>
        <div className="flex items-start gap-3 px-3 py-3">
            <button onClick={() => handleSelectConversation(conversation.id)} className="min-w-0 flex-1 text-left flex items-start gap-2">
                {conversation.isPinned && <div className="mt-1"><StarIcon filled /></div>}
                {editingId === conversation.id ? (
                    <input autoFocus className="w-full bg-transparent border-b border-scarlet outline-none text-sm font-semibold" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => handleUpdateTitle(conversation.id)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle(conversation.id)} />
                ) : (
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">{conversation.title}</p>
                        
                        {/* TIMESTAMP & FOLDER CONTEXT */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase truncate">{preview}</p>
                          {conversation.folder && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-50 flex-shrink-0" />
                              <span className="text-[9px] font-black text-scarlet uppercase tracking-widest truncate">{conversation.folder}</span>
                            </>
                          )}
                        </div>
                    </div>
                )}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conversation.id ? null : conversation.id); setFolderMenuOpenId(null); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--card-bg)] rounded text-[var(--text-muted)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            
            {/* INLINE FOLDER SELECTION MENU */}
            {folderMenuOpenId === conversation.id && (
                <div ref={sidebarMenuRef} className="absolute right-2 top-10 w-56 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl z-[60] py-3 px-3 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">Move to Folder</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      <button onClick={() => handleSetFolder(conversation.id, '')} className="w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-[var(--surface-soft)] rounded-md text-[var(--text-secondary)] italic">Remove from folder</button>
                      {existingFolders.map(f => (
                          <button key={f} onClick={() => handleSetFolder(conversation.id, f)} className="w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-[var(--surface-soft)] rounded-md truncate text-[var(--text-primary)] flex items-center justify-between">
                            {f}
                            {conversation.folder === f && <div className="w-1.5 h-1.5 rounded-full bg-scarlet" />}
                          </button>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex gap-2">
                        <input autoFocus placeholder="New folder..." className="flex-1 min-w-0 bg-[var(--surface-soft)] border border-[var(--input-border)] outline-none rounded-lg px-3 py-1.5 text-xs font-bold focus:border-scarlet transition-colors" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetFolder(conversation.id, newFolderName)} />
                        <button onClick={() => handleSetFolder(conversation.id, newFolderName)} disabled={!newFolderName.trim()} className="bg-[var(--text-primary)] text-[var(--card-bg)] px-3 rounded-lg font-black text-xs hover:opacity-80 disabled:opacity-30">+</button>
                    </div>
                </div>
            )}

            {/* DEFAULT 3-DOT MENU */}
            {menuOpenId === conversation.id && !folderMenuOpenId && (
                <div ref={sidebarMenuRef} className="absolute right-2 top-10 w-44 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl z-[60] py-1 animate-in fade-in zoom-in-95">
                    <button onClick={() => { setEditingId(conversation.id); setEditTitle(conversation.title); setMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-black hover:bg-[var(--surface-soft)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>RENAME</button>
                    <button onClick={() => handleTogglePin(conversation.id)} className="w-full text-left px-4 py-2.5 text-xs font-black hover:bg-[var(--surface-soft)] flex items-center gap-3 text-scarlet"><StarIcon filled={conversation.isPinned} />{conversation.isPinned ? 'UNPIN' : 'PIN TO TOP'}</button>
                    <button onClick={(e) => { e.stopPropagation(); setFolderMenuOpenId(conversation.id); setMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-black hover:bg-[var(--surface-soft)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>MOVE TO FOLDER</button>
                    <button onClick={() => handleToggleArchive(conversation.id)} className="w-full text-left px-4 py-2.5 text-xs font-black hover:bg-[var(--surface-soft)] flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>{conversation.isArchived ? 'UNARCHIVE' : 'ARCHIVE'}</button>
                    <div className="h-px bg-[var(--card-border)] my-1" />
                    <button onClick={() => handleDeleteConversation(conversation.id)} className="w-full text-left px-4 py-2.5 text-xs font-black text-red-500 hover:bg-red-500/10 flex items-center gap-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>DELETE</button>
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)] transition-colors">
      
      {/* SIDEBAR */}
      <aside className={`h-screen bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] shadow-xl flex flex-col p-4 relative z-50 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-20 items-center'}`}>
        <div className={isSidebarOpen ? "w-72" : "w-12 flex flex-col items-center"}>
          <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
            <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
            {isSidebarOpen && <span className="font-black text-xl tracking-tight uppercase">SCARLET <span className="text-scarlet">AI</span></span>}
          </Link>

          {isSidebarOpen && (
              <>
                <button onClick={handleNewChat} className="w-full py-3 mb-4 border-2 border-dashed border-[var(--input-border)] rounded-xl text-[var(--text-secondary)] font-bold hover:border-scarlet hover:text-scarlet transition-all">+ New Chat</button>

                <div className="w-full mb-4 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--text-muted)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                  <input placeholder="Search history..." className="w-full bg-[var(--surface-soft)] border border-[var(--input-border)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-scarlet transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                <div className="flex bg-[var(--surface-soft)] rounded-lg p-1 mb-4 border border-[var(--card-border)]">
                  <button onClick={() => setViewArchived(false)} className={`flex-1 text-[10px] font-black uppercase py-1.5 rounded-md transition-all ${!viewArchived ? 'bg-[var(--card-bg)] shadow-sm text-scarlet' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Active</button>
                  <button onClick={() => setViewArchived(true)} className={`flex-1 text-[10px] font-black uppercase py-1.5 rounded-md transition-all ${viewArchived ? 'bg-[var(--card-bg)] shadow-sm text-scarlet' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Archived</button>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-[calc(100vh-420px)] overflow-y-auto pr-1 space-y-4 custom-scrollbar pb-10">
                        {searchResults.length === 0 && <div className="text-xs text-[var(--text-muted)] font-medium text-center mt-4">No {viewArchived ? 'archived' : 'active'} chats found.</div>}
                        
                        {/* SEARCHING: Flat list. NOT SEARCHING: Organized Accordions. */}
                        {normalizedSearchQuery ? (
                          <div className="space-y-2">{searchResults.map(result => <ChatListItem key={result.conversation.id} result={result} />)}</div>
                        ) : (
                          <>
                            {/* PINNED SECTION (Collapsible) */}
                            {pinnedChats.length > 0 && (
                              <div className="mb-2">
                                <button onClick={() => toggleFolderCollapse('pinned')} className="w-full flex items-center justify-between font-bold uppercase tracking-widest text-[10px] text-scarlet mb-2 px-2 hover:opacity-80 transition-opacity">
                                  <div className="flex items-center gap-1.5"><StarIcon filled /> Pinned Chats</div>
                                  <ChevronIcon open={!collapsedFolders['pinned']} />
                                </button>
                                {!collapsedFolders['pinned'] && <div className="space-y-2 ml-1">{pinnedChats.map(result => <ChatListItem key={result.conversation.id} result={result} />)}</div>}
                              </div>
                            )}

                            {/* FOLDER SECTIONS (Collapsible) */}
                            {folderKeys.map(folderName => (
                              <div key={folderName} className="mb-2">
                                <button onClick={() => toggleFolderCollapse(folderName)} className="w-full flex items-center justify-between font-bold uppercase tracking-widest text-[10px] text-[var(--text-muted)] mb-2 px-2 hover:text-[var(--text-primary)] transition-colors">
                                  <div className="flex items-center gap-1.5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> 
                                    {folderName}
                                  </div>
                                  <ChevronIcon open={!collapsedFolders[folderName]} />
                                </button>
                                {!collapsedFolders[folderName] && <div className="space-y-2 ml-1">{groupedFolders[folderName].map(result => <ChatListItem key={result.conversation.id} result={result} />)}</div>}
                              </div>
                            ))}
                          </>
                        )}
                    </div>
                </div>
              </>
          )}
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--card-border)] w-full flex justify-center">
            {userEmail ? <LogoutButton /> : <Link href="/login" className="text-scarlet font-bold p-3 text-xs uppercase tracking-widest">Login</Link>}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col relative z-10">
        <header className="flex items-center justify-between px-6 py-4 bg-[var(--card-bg)] border-b border-[var(--card-border)] shadow-sm sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[var(--surface-soft)] rounded-lg text-[var(--text-muted)] hidden md:block">{isSidebarOpen ? '❮' : '❯'}</button>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <h1 className="font-black tracking-wide text-[var(--text-primary)] text-xs sm:text-sm flex items-center gap-2">
              {activeConversation?.isPinned && <StarIcon filled />}
              {activeConversation?.title || "New Session"}
            </h1>
            <div className="flex gap-2 mt-1">
              {activeConversation?.isArchived && <span className="text-[8px] font-bold text-scarlet uppercase tracking-widest px-2 py-0.5 bg-scarlet/10 rounded-full">Archived</span>}
              {activeConversation?.folder && <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2 py-0.5 bg-[var(--surface-soft)] border border-[var(--card-border)] rounded-full">{activeConversation.folder}</span>}
            </div>
          </div>

          <div className="flex justify-end">
            <Link href={profileHref} className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block uppercase">
                <p className="text-[11px] font-black group-hover:text-scarlet transition-colors">{userName}</p>
                <p className="text-[9px] text-[var(--text-muted)] font-bold mt-1">{userMajor}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[var(--surface-soft)] border border-[var(--card-border)] group-hover:border-scarlet flex items-center justify-center overflow-hidden transition-colors">
                <Image src="/websiteicon.png" alt="Profile" width={20} height={20} className="opacity-30 grayscale group-hover:grayscale-0 transition-all" />
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[var(--app-bg)]">
          {activeConversation?.messages.map((msg, i) => {
            const isMultiResponse = msg.role === 'assistant' && msg.comparisonResponses && msg.comparisonResponses.length > 1;
            const hasSingleResponse = msg.role === 'assistant' && msg.comparisonResponses && msg.comparisonResponses.length === 1;
            
            return (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-start gap-3 w-full ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex-shrink-0 flex items-center justify-center bg-[var(--card-bg)] shadow-sm">
                      <Image src="/overlayicon.png" alt="AI" width={18} height={18} />
                    </div>
                  )}
                  
                  <div className={`${isMultiResponse ? 'w-full' : 'w-fit max-w-[85%]'}`}>
                    {isMultiResponse ? (
                      <div className={`grid gap-4 ${msg.comparisonResponses!.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                        {msg.comparisonResponses!.map((res, idx) => {
                          const isRegen = isRegenerating?.msgIndex === i && isRegenerating?.modelId === res.modelId;
                          return (
                          <div key={idx} className={`bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl p-5 shadow-sm flex flex-col h-full border-t-scarlet transition-opacity duration-300 ${isRegen ? 'opacity-50' : 'opacity-100'}`}>
                             <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--card-border)]">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-scarlet uppercase tracking-widest">{res.modelLabel}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] font-bold">{res.durationMs}ms</span>
                                </div>
                                <button onClick={() => handleRegenerateSingleModel(i, res.modelId)} disabled={isRegenerating !== null} className={`p-1.5 rounded-lg text-[var(--text-muted)] hover:text-scarlet hover:bg-[var(--surface-soft)] transition-all ${isRegen ? 'animate-spin text-scarlet' : ''}`} title={`Regenerate ${res.modelLabel} response`}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                </button>
                             </div>
                             <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap flex-1">{res.content}</div>
                          </div>
                        )})}
                      </div>
                    ) : hasSingleResponse ? (
                      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl rounded-tl-none p-4 shadow-sm w-fit">
                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-2 mb-2 gap-4">
                           <div>
                             <span className="text-[10px] font-black text-scarlet uppercase tracking-widest">{msg.comparisonResponses![0].modelLabel}</span>
                             <span className="text-[8px] text-[var(--text-muted)] ml-2">({msg.comparisonResponses![0].durationMs}ms)</span>
                           </div>
                           <button onClick={() => handleRegenerateSingleModel(i, msg.comparisonResponses![0].modelId)} disabled={isRegenerating !== null} className={`p-1 text-[var(--text-muted)] hover:text-scarlet transition-colors ${isRegenerating?.msgIndex === i ? 'animate-spin text-scarlet' : ''}`} title="Regenerate response">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                           </button>
                        </div>
                        <div className={`text-sm font-medium whitespace-pre-wrap transition-opacity duration-300 ${isRegenerating?.msgIndex === i ? 'opacity-50' : 'opacity-100'}`}>{msg.comparisonResponses![0].content}</div>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl font-medium whitespace-pre-wrap shadow-sm w-fit ${msg.role === 'user' ? 'bg-scarlet text-white border-none rounded-tr-none' : 'bg-[var(--card-bg)] border border-[var(--card-border)] rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {isGenerating && (
             <div className="flex items-start gap-3 w-fit">
                <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex-shrink-0 flex items-center justify-center bg-[var(--card-bg)] animate-pulse"><Image src="/overlayicon.png" alt="AI" width={18} height={18} className="opacity-50" /></div>
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl rounded-tl-none p-4 shadow-sm w-fit"><span className="text-[10px] font-black text-scarlet uppercase tracking-[0.2em] animate-pulse">Generating ({selectedModelIds.length} models) ...</span></div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* COMPOSER FOOTER */}
        <div className="p-6 bg-[var(--app-bg)] border-t border-[var(--card-border)]">
          <div className="max-w-4xl mx-auto relative">
            
            {isModelMenuOpen && (
              <div ref={modelMenuRef} className="absolute bottom-full left-0 mb-4 w-64 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl p-4 z-[100] animate-in slide-in-from-bottom-2">
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

            <div className="flex flex-col bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-2xl focus-within:border-scarlet transition-all shadow-xl">
              
              <div className="px-5 pt-3 pb-1 border-b border-[var(--card-border)] bg-[var(--surface-soft)] rounded-t-2xl flex items-center gap-2">
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Using:</span>
                <span className="text-[10px] font-bold text-scarlet">{selectedModelLabels}</span>
              </div>

              <textarea
                ref={composerRef}
                placeholder={activeConversation?.isArchived ? "Unarchive this chat to send a message..." : `Hi ${userFirstName}, ask Scarlet AI anything...`}
                className="w-full min-h-[64px] p-5 bg-transparent outline-none font-medium leading-6 text-sm disabled:opacity-50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                maxLength={2000}
                disabled={activeConversation?.isArchived}
              />
              <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-[var(--input-border)]">
                <button onClick={() => setIsModelMenuOpen(!isModelMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-soft)] hover:bg-scarlet/10 rounded-lg transition-all border border-[var(--card-border)] shadow-sm">
                   <div className="flex -space-x-2">
                      {selectedModelIds.slice(0, 3).map(id => (<div key={id} className="w-4 h-4 rounded-full bg-scarlet border border-white flex items-center justify-center text-[8px] text-white font-bold">{id[0].toUpperCase()}</div>))}
                   </div>
                   <span className="text-[10px] font-black uppercase text-scarlet tracking-tighter">{selectedModelIds.length > 1 ? `Compare (${selectedModelIds.length})` : getChatModelOption(selectedModelIds[0]).label}</span>
                </button>
                <button onClick={handleSendMessage} disabled={isGenerating || !input.trim() || activeConversation?.isArchived} className="bg-scarlet text-white px-6 h-9 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#990026] shadow-lg active:scale-95 disabled:opacity-50 transition-all">
                  {isGenerating ? 'Wait' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


/*

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL, getChatModelOption } from '@/lib/chat-models';
import { supabase, SUPABASE_ERROR_MESSAGE } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  durationMs?: number;
  modelId?: string;
  modelLabel?: string;
  modelDescription?: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

type ConversationSearchResult = {
  conversation: Conversation;
  preview: string;
  matchType: 'title' | 'message';
  rank: number;
};

const STORAGE_KEY = 'scarlet-ai-conversations';

function createUntitledConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `conversation-${Date.now()}`,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function deriveTitle(message: string) {
  // Respecting case sensitivity as requested
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

export default function ChatHub() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMajor, setUserMajor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_CHAT_MODEL.id);
  
  // UI STATES
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // NEW SEARCH STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const sidebarMenuRef = useRef<HTMLDivElement | null>(null);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const profileHref = userEmail ? '/profile' : '/login';

  // SEARCH FILTER LOGIC
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredConversations: ConversationSearchResult[] = conversations
    .map((conversation) => {
      if (!normalizedSearchQuery) {
        return {
          conversation,
          preview: new Date(conversation.updatedAt).toLocaleString([], {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
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

      const matchingMessage = conversation.messages.find((message) =>
        message.content.toLowerCase().includes(normalizedSearchQuery)
      );

      if (!matchingMessage) {
        return null;
      }

      const messageIndex = matchingMessage.content.toLowerCase().indexOf(normalizedSearchQuery);

      return {
        conversation,
        preview: buildSearchPreview(matchingMessage.content, normalizedSearchQuery),
        matchType: 'message' as const,
        rank: messageIndex + 1000,
      };
    })
    .filter((result): result is ConversationSearchResult => result !== null)
    .sort((a, b) => {
      if (normalizedSearchQuery && a.matchType !== b.matchType) {
        return a.matchType === 'title' ? -1 : 1;
      }

      if (normalizedSearchQuery && a.rank !== b.rank) {
        return a.rank - b.rank;
      }

      return (
        new Date(b.conversation.updatedAt).getTime() - new Date(a.conversation.updatedAt).getTime()
      );
    });

  // CLICK AWAY LISTENER FOR THREE-DOT MENU
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        setUserEmail(null);
        setUserName('Guest User');
        setUserMajor('Guest');
        return;
      }

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (user) {
          setUserEmail(user.email ?? null);
          setUserName(user.user_metadata?.full_name || 'Scarlet Knight');
          setUserMajor(user.user_metadata?.major || 'Student');
        } else {
          setUserEmail(null);
          setUserName('Guest User');
          setUserMajor('Guest');
        }
      } catch (authError) {
        console.error('Unable to load Supabase user on chat page:', authError);
        setUserEmail(null);
        setUserName('Guest User');
        setUserMajor('Guest');
        setError(SUPABASE_ERROR_MESSAGE);

        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutError) {
          console.error('Unable to clear local Supabase session:', signOutError);
        }
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
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
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
    if (!hasLoadedLocalState) return;
    if (conversations.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hasLoadedLocalState]);

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
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, title: editTitle, updatedAt: new Date().toISOString() } : c
    ));
    setEditingId(null);
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
      current
        .map((conversation) => conversation.id === activeConversation.id ? updatedConversation : conversation)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
    setInput('');
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          conversationId: activeConversation.id,
          messages: updatedConversation.messages,
          modelId: selectedModelId,
          userName,
        }),
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
          return {
            ...conversation,
            id: data.conversationId || conversation.id,
            updatedAt: new Date().toISOString(),
            messages: [...updatedConversation.messages, assistantMessage],
          };
        }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      );
      if (data.conversationId) setActiveConversationId(data.conversationId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send your message.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || !activeConversation || isGenerating) return;
      void handleSendMessage(e);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)] transition-colors">
      
      {/* SIDEBAR */ //}
      
/*      
      <aside className={`h-screen bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] shadow-[6px_0_24px_rgba(15,23,42,0.05)] flex flex-col p-4 relative z-50 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-20 items-center'}`}>
        <div className={isSidebarOpen ? "w-72" : "w-12 flex flex-col items-center"}>
          <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
            <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
            {isSidebarOpen && (
                <span className="font-black text-xl tracking-tight uppercase">
                    SCARLET <span className="text-scarlet">AI</span>
                </span>
            )}
          </Link>

          {isSidebarOpen && (
              <>
                <button
                    onClick={handleNewChat}
                    className="w-full py-3 mb-4 border-2 border-dashed border-[var(--input-border)] rounded-xl text-[var(--text-secondary)] font-bold hover:border-scarlet hover:text-scarlet transition-all"
                >
                    + New Chat
                </button>
*/
                {/* SEARCH MECHANISM */}
                /*
                <div className="relative mb-6">
                   <div className={`flex items-center transition-all duration-300 bg-[var(--surface-soft)] border border-[var(--input-border)] rounded-xl px-3 ${isSearchExpanded ? 'w-full shadow-sm ring-1 ring-[#cc0033]/20' : 'w-10'} shadow-[0_6px_16px_rgba(15,23,42,0.04)]`}>
                      <button onClick={() => setIsSearchExpanded(!isSearchExpanded)} className="p-1 text-[var(--text-muted)] hover:text-[#cc0033]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </button>
                      {isSearchExpanded && (
                        <input 
                          autoFocus
                          placeholder="Search chats..."
                          className="bg-transparent border-none outline-none text-xs font-bold w-full ml-2 py-2 text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      )}
                   </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <p className="font-bold uppercase tracking-widest text-[10px] text-[var(--text-muted)] mb-4 px-2">
                        Recent History
                    </p>

                    <div className="h-[calc(100vh-380px)] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                        {filteredConversations.length === 0 && (
                            <div className="text-sm text-[var(--text-secondary)] italic px-2">No results found.</div>
                        )}

                        {filteredConversations.map(({ conversation, preview, matchType }) => (
                            <div
                                key={conversation.id}
                                className={`rounded-xl border transition-all relative ${
                                    conversation.id === activeConversationId
                                        ? 'bg-[var(--surface-soft)] border-scarlet/20 shadow-[0_8px_18px_rgba(15,23,42,0.06)]'
                                        : 'bg-transparent border-transparent hover:bg-[var(--surface-soft)] hover:border-[var(--card-border)] hover:shadow-[0_6px_14px_rgba(15,23,42,0.04)]'
                                }`}
                            >
                                <div className="flex items-start gap-3 px-3 py-3 group">
                                    <button
                                        onClick={() => handleSelectConversation(conversation.id)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        {editingId === conversation.id ? (
                                            <input 
                                                autoFocus
                                                className="w-full bg-transparent border-b border-scarlet outline-none text-sm font-semibold text-[var(--text-primary)]"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onBlur={() => handleUpdateTitle(conversation.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle(conversation.id)}
                                            />
                                        ) : (
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                                                    {conversation.title}
                                                </p>
                                                {normalizedSearchQuery ? (
                                                    <div className="mt-1">
                                                        <p className="text-[10px] text-scarlet font-black uppercase tracking-widest">
                                                            {matchType === 'title' ? 'Title' : 'Conversation'}
                                                        </p>
                                                        <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                                                            {preview}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-[var(--text-muted)] mt-1 font-bold uppercase">
                                                        {preview}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conversation.id ? null : conversation.id); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--card-bg)] rounded text-[var(--text-muted)]"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                    </button>
*/
                                    {/* Professional Menu Dropdown */} /*
                                    {menuOpenId === conversation.id && (
                                        <div ref={sidebarMenuRef} className="absolute right-2 top-10 w-36 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl z-[60] py-1 overflow-hidden animate-in fade-in zoom-in duration-100">
                                            <button 
                                                onClick={() => { setEditingId(conversation.id); setEditTitle(conversation.title); setMenuOpenId(null); }}
                                                className="w-full text-left px-4 py-2 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] flex items-center gap-3"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                RENAME
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteConversation(conversation.id)}
                                                className="w-full text-left px-4 py-2 text-xs font-black text-red-400 hover:bg-[rgba(204,0,51,0.08)] flex items-center gap-3"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                DELETE
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--card-border)] w-full flex justify-center">
            {userEmail ? <LogoutButton /> : <Link href="/login" className="text-scarlet font-bold block text-center p-3 text-xs uppercase tracking-widest">Login</Link>}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10">
        <header className="flex items-center justify-between px-6 py-4 bg-[var(--card-bg)] border-b border-[var(--card-border)] shadow-[0_10px_30px_rgba(15,23,42,0.04)] sticky top-0 z-40">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[var(--surface-soft)] rounded-lg text-[var(--text-muted)] transition-colors hidden md:block"
          >
            {isSidebarOpen ? '❮' : '❯'}
          </button>
          
          <button
            onClick={handleNewChat}
            className="md:hidden bg-[var(--surface-soft)] text-[var(--text-secondary)] px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            New Chat
          </button>
*/
          {/* CENTERED TITLE - Respecting case sensitivity */}/*
          <h1 className="absolute left-1/2 -translate-x-1/2 font-black tracking-widest text-[var(--text-primary)] text-xs sm:text-sm text-center">
            {activeConversation?.title || "New Session"}
          </h1>

          <div className="flex justify-end">
            <Link href={profileHref} className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
              */  {/* FORCED ALL CAPS USERNAME */}
              /*
                <p className="text-[11px] font-black text-[var(--text-primary)] leading-none group-hover:text-scarlet transition-colors uppercase">
                  {userName}
                </p>
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

          {activeConversation?.messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex-shrink-0 flex items-center justify-center bg-[var(--card-bg)] shadow-sm">
                  <Image src="/overlayicon.png" alt="AI" width={18} height={18} />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.06)] font-medium whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)] border border-[var(--user-bubble-border)] rounded-tr-none' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-tl-none'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-start gap-3">
              <div className="relative w-9 h-9 flex-shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-t-scarlet border-transparent animate-spin" />
                <div className="w-full h-full rounded-full border border-[var(--card-border)] flex items-center justify-center bg-[var(--card-bg)]">
                  <Image src="/overlayicon.png" alt="AI" width={18} height={18} className="opacity-50" />
                </div>
              </div>
              <div className="bg-[var(--surface-soft)] border border-[var(--card-border)] p-5 rounded-2xl rounded-tl-none shadow-[0_10px_24px_rgba(15,23,42,0.06)] flex flex-col gap-2 min-w-[200px]">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">
                  {`Thinking with ${getChatModelOption(selectedModelId).label}...`}
                </span>
              </div>
            </div>
          )}

          {error && <div className="max-w-xl rounded-2xl border border-[var(--message-error-border)] bg-[var(--message-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--message-error-text)]">{error}</div>}
          <div ref={messagesEndRef} />
        </div>
*/
        {/* ACTION BAR FOOTER */} /*
        <div className="p-6 bg-[var(--app-bg)] border-t border-[var(--card-border)]">
          <div className="max-w-4xl mx-auto">
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
              
              <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-[var(--input-border)]">
                <div className="flex gap-2">
                   <button type="button" className="p-2 text-[var(--text-muted)] hover:text-scarlet transition-colors">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                   </button>
                </div>

                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <select
                          value={selectedModelId}
                          onChange={(e) => setSelectedModelId(e.target.value)}
                          className="text-[10px] font-black text-[var(--text-secondary)] hover:text-scarlet bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-2 py-1.5 outline-none cursor-pointer transition-colors shadow-sm"
                      >
                          {CHAT_MODEL_OPTIONS.map((model) => (
                              <option key={model.id} value={model.id}>
                                  {model.label} ({model.provider === 'ollama' ? 'Local' : 'Cloud'})
                              </option>
                          ))}
                      </select>
                   </div>
                   
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
            </div>
            
            <div className="mt-4 flex flex-col items-center gap-1">
               <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] text-center">
                 {getChatModelOption(selectedModelId).description}
               </p>
               <p className="text-[8px] font-bold text-[var(--text-muted)] text-center italic">
                 {getChatModelOption(selectedModelId).details}
               </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
*/