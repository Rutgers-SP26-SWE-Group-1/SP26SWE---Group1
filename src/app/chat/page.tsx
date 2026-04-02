'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { supabase } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
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
  const [provider, setProvider] = useState<string | null>(null);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    if (!hasLoadedLocalState || conversations.length === 0) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hasLoadedLocalState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length, isGenerating]);

  const handleNewChat = () => {
    const freshConversation = createUntitledConversation();
    setConversations((current) => [freshConversation, ...current]);
    setActiveConversationId(freshConversation.id);
    setInput('');
    setError(null);
    setProvider(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setError(null);
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
          userName,
        }),
      });

      const data = (await response.json()) as {
        content?: string;
        error?: string;
        provider?: string;
        conversationId?: string;
      };

      if (!response.ok || !data.content) {
        throw new Error(data.error || 'Scarlet AI could not generate a response.');
      }

      const assistantMessage: Message = { role: 'assistant', content: data.content };

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
      setProvider(data.provider || 'fallback');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Unable to send your message.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <aside className="w-72 bg-slate-50 border-r border-slate-200 flex-col p-4 hidden md:flex relative z-50">
        <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
          <span className="font-black text-xl tracking-tight">
            SCARLET <span className="text-scarlet">AI</span>
          </span>
        </Link>

        <button
          onClick={handleNewChat}
          className="w-full py-3 mb-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-scarlet hover:text-scarlet transition-all"
        >
          + New Chat
        </button>

        <div className="flex-1 overflow-y-auto">
          <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400 mb-4">
            Recent History
          </p>

          <div className="space-y-2">
            {conversations.length === 0 && (
              <div className="text-sm text-slate-500 italic">No recent chats found.</div>
            )}

            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className={`w-full text-left rounded-xl px-3 py-3 border transition-all ${
                  conversation.id === activeConversationId
                    ? 'bg-white border-scarlet/30 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                  {conversation.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {new Date(conversation.updatedAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200">
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
        <header className="flex justify-between items-center px-6 py-3 bg-white border-b border-slate-100 gap-4">
          <button
            onClick={handleNewChat}
            className="md:hidden bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            New Chat
          </button>

          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {provider ? `Provider: ${provider}` : 'Ready for chat'}
          </div>

          <Link href={profileHref} className="flex items-center gap-3 group">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-black text-slate-900 leading-none group-hover:text-scarlet transition-colors uppercase">
                {userName}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{userMajor}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 group-hover:border-scarlet flex items-center justify-center overflow-hidden">
              <Image
                src="/websiteicon.png"
                alt="Profile"
                width={20}
                height={20}
                className="opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
              />
            </div>
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeConversation && activeConversation.messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <Image src="/overlayicon.png" alt="Logo" width={100} height={100} />
              <h2 className="text-2xl font-black mt-4 uppercase tracking-tighter italic">
                How can I help you, {userName?.split(' ')[0] || 'Scarlet Knight'}?
              </h2>
              <p className="max-w-xl mt-3 text-sm text-slate-500 font-medium">
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
                <div className="w-8 h-8 rounded-full border border-slate-200 flex-shrink-0 flex items-center justify-center bg-white shadow-sm">
                  <Image src="/overlayicon.png" alt="AI" width={18} height={18} />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl shadow-sm font-medium whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#cc0033] text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-start gap-3">
              <div className="relative w-9 h-9 flex-shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-t-scarlet border-transparent animate-spin" />
                <div className="w-full h-full rounded-full border border-slate-200 flex items-center justify-center bg-white">
                  <Image src="/overlayicon.png" alt="AI" width={18} height={18} className="opacity-50" />
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl rounded-tl-none shadow-sm flex flex-col gap-2 min-w-[200px]">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">
                  Analyzing Prompt...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              placeholder={`Hello ${userName?.split(' ')[0] || 'there'}, ask Scarlet AI anything...`}
              className="w-full p-5 pr-20 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-2xl focus:border-scarlet outline-none transition-all placeholder:text-slate-400 font-medium"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={isGenerating || !activeConversation}
              className="absolute right-3 top-3 bottom-3 bg-[#cc0033] text-white px-5 rounded-xl font-bold hover:bg-[#990026] shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <span className="hidden sm:inline text-sm uppercase">
                {isGenerating ? 'Thinking' : 'Send'}
              </span>
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-500 mt-4 font-bold uppercase tracking-[0.2em]">
            Official Interface • Rutgers Software Engineering
          </p>
        </div>
      </main>
    </div>
  );
}
