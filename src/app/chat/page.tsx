'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL, getChatModelOption } from '@/lib/chat-models';
import { supabase } from '@/lib/supabase';

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
  return message.trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 48) || 'New chat';
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const profileHref = userEmail ? '/profile' : '/login';

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email ?? null);
        setUserName(user.user_metadata?.full_name || 'Scarlet Knight');
        setUserMajor(user.user_metadata?.major || 'Student');
      } else {
        setUserEmail(null);
        setUserName('Guest User');
        setUserMajor('Guest');
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
    if (!hasLoadedLocalState) {
      return;
    }

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
    if (!textarea) {
      return;
    }

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
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setError(null);
  };

  const handleDeleteConversation = (
    e: React.MouseEvent<HTMLButtonElement>,
    conversationId: string
  ) => {
    e.stopPropagation();

    const conversationToDelete = conversations.find((conversation) => conversation.id === conversationId);
    if (!conversationToDelete) {
      return;
    }

    const shouldDelete = window.confirm(
      `Are you sure you want to delete "${conversationToDelete.title}"?`
    );

    if (!shouldDelete) {
      return;
    }

    const remainingConversations = conversations.filter(
      (conversation) => conversation.id !== conversationId
    );

    if (remainingConversations.length === 0) {
      const freshConversation = createUntitledConversation();
      setConversations([freshConversation]);
      setActiveConversationId(freshConversation.id);
      setInput('');
      setError(null);
      return;
    }

    setConversations(remainingConversations);

    if (activeConversationId === conversationId) {
      setActiveConversationId(remainingConversations[0].id);
      setInput('');
      setError(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || !activeConversation || isGenerating) {
      return;
    }

    const userMessage: Message = { role: 'user', content: trimmedInput };
    const updatedConversation: Conversation = {
      ...activeConversation,
      title:
        activeConversation.messages.length === 0 ? deriveTitle(trimmedInput) : activeConversation.title,
      updatedAt: new Date().toISOString(),
      messages: [...activeConversation.messages, userMessage],
    };

    setConversations((current) =>
      current
        .map((conversation) =>
          conversation.id === activeConversation.id ? updatedConversation : conversation
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
    setInput('');
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedInput,
          conversationId: activeConversation.id,
          messages: updatedConversation.messages,
          modelId: selectedModelId,
          userName,
        }),
      });

      const data = (await response.json()) as {
        content?: string;
        error?: string;
        conversationId?: string;
        durationMs?: number;
        modelId?: string;
        modelLabel?: string;
        modelDescription?: string;
      };

      if (!response.ok || !data.content) {
        throw new Error(data.error || 'Scarlet AI could not generate a response.');
      }

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
        current
          .map((conversation) => {
            if (conversation.id !== activeConversation.id) {
              return conversation;
            }

            return {
              ...conversation,
              id: data.conversationId || conversation.id,
              updatedAt: new Date().toISOString(),
              messages: [...updatedConversation.messages, assistantMessage],
            };
          })
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      );
      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Unable to send your message.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) {
      return;
    }

    e.preventDefault();

    if (!input.trim() || !activeConversation || isGenerating) {
      return;
    }

    void handleSendMessage(e);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--card-bg)] text-[var(--text-primary)] transition-colors">
      <aside className="w-72 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] flex-col p-4 hidden md:flex relative z-50 overflow-hidden transition-colors">
        <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
          <span className="font-black text-xl tracking-tight">
            SCARLET <span className="text-scarlet">AI</span>
          </span>
        </Link>

        <button
          onClick={handleNewChat}
          className="w-full py-3 mb-6 border-2 border-dashed border-[var(--input-border)] rounded-xl text-[var(--text-secondary)] font-bold hover:border-scarlet hover:text-scarlet transition-all"
        >
          + New Chat
        </button>

        <div className="flex-1 min-h-0 overflow-hidden">
          <p className="font-bold uppercase tracking-widest text-[10px] text-[var(--text-muted)] mb-4">
            Recent History
          </p>

          <div className="h-full overflow-y-auto pr-1 space-y-2">
            {conversations.length === 0 && (
              <div className="text-sm text-[var(--text-secondary)] italic">No recent chats found.</div>
            )}

            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`rounded-xl border transition-all ${
                  conversation.id === activeConversationId
                    ? 'bg-[var(--card-bg)] border-scarlet/30 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-[var(--card-bg)] hover:border-[var(--card-border)]'
                }`}
              >
                <div className="flex items-start gap-3 px-3 py-3">
                  <button
                    onClick={() => handleSelectConversation(conversation.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                        {conversation.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">
                        {new Date(conversation.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    aria-label={`Delete ${conversation.title}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--message-error-bg)] hover:text-scarlet"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--card-border)]">
          {userEmail ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className="text-scarlet font-bold block text-center p-3">
              Login
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10">
        <header className="grid grid-cols-[auto_1fr_auto] items-center px-6 py-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] gap-4 transition-colors">
          <button
            onClick={handleNewChat}
            className="md:hidden bg-[var(--surface-soft)] text-[var(--text-secondary)] px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          >
            New Chat
          </button>

          <div className="flex justify-center">
            <div className="hidden md:flex items-end gap-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] shrink-0 pb-2">
                Ready for chat
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)] text-center">
                  AI Model
                </span>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="min-w-[190px] rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition-all focus:border-scarlet"
                >
                  {CHAT_MODEL_OPTIONS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {`${model.label} - ${model.description}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href={profileHref} className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-[var(--text-primary)] leading-none group-hover:text-scarlet transition-colors uppercase">
                  {userName}
                </p>
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">{userMajor}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[var(--surface-soft)] border border-[var(--card-border)] group-hover:border-scarlet flex items-center justify-center overflow-hidden transition-colors">
                <Image
                  src="/websiteicon.png"
                  alt="Profile"
                  width={20}
                  height={20}
                  className="opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                />
              </div>
            </Link>
          </div>
        </header>

        <div className="md:hidden px-6 py-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] transition-colors">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
              AI Model
            </span>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none transition-all focus:border-scarlet"
            >
              {CHAT_MODEL_OPTIONS.map((model) => (
                <option key={model.id} value={model.id}>
                  {`${model.label} - ${model.description}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            <div
              key={`${activeConversation.id}-${i}`}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex-shrink-0 flex items-center justify-center bg-[var(--card-bg)] shadow-sm transition-colors">
                  <Image src="/overlayicon.png" alt="AI" width={18} height={18} />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl shadow-sm font-medium whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#cc0033] text-white rounded-tr-none'
                      : 'bg-[var(--surface-soft)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && msg.modelLabel && (
                  <p className="mt-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {msg.modelLabel}
                    {msg.modelDescription ? ` • ${msg.modelDescription}` : ''}
                    {typeof msg.durationMs === 'number' && msg.durationMs > 0
                      ? ` • ${(msg.durationMs / 1000).toFixed(1)}s`
                      : ''}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-start gap-3">
              <div className="relative w-9 h-9 flex-shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-t-scarlet border-transparent animate-spin" />
                <div className="w-full h-full rounded-full border border-[var(--card-border)] flex items-center justify-center bg-[var(--card-bg)] transition-colors">
                  <Image src="/overlayicon.png" alt="AI" width={18} height={18} className="opacity-50" />
                </div>
              </div>
              <div className="bg-[var(--surface-soft)] border border-[var(--card-border)] p-5 rounded-2xl rounded-tl-none shadow-sm flex flex-col gap-2 min-w-[200px] transition-colors">
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

          {error && (
            <div className="max-w-xl rounded-2xl border border-[var(--message-error-border)] bg-[var(--message-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--message-error-text)]">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-[var(--card-bg)] border-t border-[var(--card-border)] transition-colors">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <textarea
              ref={composerRef}
              placeholder={`Hello ${userName?.split(' ')[0] || 'there'}, ask Scarlet AI anything...`}
              className="w-full min-h-[64px] max-h-[144px] resize-none overflow-y-hidden p-5 pr-28 bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-primary)] rounded-2xl focus:border-scarlet outline-none transition-all placeholder:text-[var(--input-placeholder)] font-medium leading-6"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              maxLength={2000}
              rows={1}
            />
            <button
              type="submit"
              disabled={isGenerating || !activeConversation}
              className="absolute right-3 bottom-3 bg-[#cc0033] text-white px-5 h-10 rounded-xl font-bold hover:bg-[#990026] shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <span className="hidden sm:inline text-sm uppercase">
                {isGenerating ? 'Thinking' : 'Send'}
              </span>
            </button>
          </form>
          <p className="text-[10px] text-center text-[var(--text-secondary)] mt-4 font-bold uppercase tracking-[0.2em]">
            {`${getChatModelOption(selectedModelId).label} • ${getChatModelOption(selectedModelId).description}`}
          </p>
        </div>
      </main>
    </div>
  );
}
