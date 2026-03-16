'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton'; 

export default function ChatHub() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // New State for Metadata
  const [userName, setUserName] = useState<string | null>(null);
  const [userMajor, setUserMajor] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
        // Pull name and major from metadata
        setUserName(user.user_metadata?.full_name || 'Scarlet Knight');
        setUserMajor(user.user_metadata?.major || 'Student');
      }
    };
    getUser();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    setTimeout(() => {
      const aiResponse = { role: 'assistant', content: "This is a placeholder response from Scarlet AI. We will connect Gemini/Ollama in Iteration 2!" };
      setMessages(prev => [...prev, aiResponse]);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-white text-slate-900">
      {/* 1. Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 hidden md:flex relative z-50">
        <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
          <span className="font-black text-xl tracking-tight">SCARLET <span className="text-scarlet">AI</span></span>
        </Link>
        
        <button className="w-full py-3 mb-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-scarlet hover:text-scarlet transition-all">
          + New Chat
        </button>

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent History</p>
          {userEmail ? (
            <div className="text-sm text-slate-500 italic">No recent chats found.</div>
          ) : (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-700">
              Log in to save your chat history and sync across devices.
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200 flex flex-col items-center">
          {userEmail ? <LogoutButton /> : <Link href="/login" className="text-scarlet font-bold block text-center w-full p-3 hover:bg-red-50 rounded-xl transition-all">Login</Link>}
        </div>
      </aside>

      {/* 2. Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-10">
        
        {/* TOP HEADER WITH PROFILE LINK */}
        <header className="flex justify-end items-center px-6 py-3 bg-white border-b border-slate-100">
          {userEmail && (
            <Link href="/profile" className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-slate-900 leading-none group-hover:text-scarlet transition-colors uppercase tracking-tight">
                  {userName}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                  {userMajor}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 group-hover:border-scarlet transition-all flex items-center justify-center overflow-hidden">
                <Image src="/overlayicon.png" alt="Profile" width={20} height={20} className="opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
              </div>
            </Link>
          )}
        </header>

        {/* Messages Display */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
               <Image src="/overlayicon.png" alt="Logo" width={100} height={100} />
               <h2 className="text-2xl font-black mt-4 uppercase tracking-tighter italic">How can I help you, Scarlet Knight?</h2>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full border border-slate-200 flex-shrink-0 flex items-center justify-center bg-white">
                  <Image src="/overlayicon.png" alt="AI" width={20} height={20} />
                </div>
              )}
              <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm font-medium ${
                msg.role === 'user' ? 'bg-[#cc0033] text-white rounded-tr-none' : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Input Bar */}
        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <input 
              type="text" 
              // DYNAMIC PLACEHOLDER: Greets by First Name if available
              placeholder={userEmail ? `Hello ${userName?.split(' ')[0]}, ask Scarlet AI anything...` : "Ask Scarlet AI anything..."}
              className="w-full p-5 pr-20 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-2xl focus:border-scarlet outline-none transition-all placeholder:text-slate-400 font-medium"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-3 bottom-3 bg-[#cc0033] text-white px-5 rounded-xl font-bold hover:bg-[#990026] shadow-md active:scale-95 transition-all">
              <span className="hidden sm:inline text-sm uppercase tracking-wider">Send</span>
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