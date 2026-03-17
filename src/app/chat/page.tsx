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
  const [userName, setUserName] = useState<string | null>(null);
  const [userMajor, setUserMajor] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
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

    // Simulated Delay for "Thinking" phase
    setTimeout(() => {
      const aiResponse = { role: 'assistant', content: "This is a placeholder response from Scarlet AI. We will connect Gemini/Ollama in Iteration 2!" };
      setMessages(prev => [...prev, aiResponse]);
      setIsGenerating(false);
    }, 3000); // 3 seconds to show off the animation
  };

  return (
    <div className="flex h-screen bg-white text-slate-900">
      {/* 1. Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 hidden md:flex relative z-50">
        <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
          <span className="font-black text-xl tracking-tight">SCARLET <span className="text-scarlet">AI</span></span>
        </Link>
        <button className="w-full py-3 mb-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-scarlet hover:text-scarlet transition-all">+ New Chat</button>
        <div className="flex-1 overflow-y-auto font-bold uppercase tracking-widest text-[10px] text-slate-400">
           Recent History
           <div className="mt-4 text-sm text-slate-500 italic font-normal lowercase tracking-normal">No recent chats found.</div>
        </div>
        <div className="mt-auto pt-4 border-t border-slate-200">{userEmail ? <LogoutButton /> : <Link href="/login" className="text-scarlet font-bold block text-center p-3">Login</Link>}</div>
      </aside>

      {/* 2. Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-10">
        <header className="flex justify-end items-center px-6 py-3 bg-white border-b border-slate-100">
          {userEmail && (
            <Link href="/profile" className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-slate-900 leading-none group-hover:text-scarlet transition-colors uppercase">{userName}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{userMajor}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 group-hover:border-scarlet flex items-center justify-center overflow-hidden">
                <Image src="/websiteicon.png" alt="Profile" width={20} height={20} className="opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
              </div>
            </Link>
          )}
        </header>

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
                <div className="w-8 h-8 rounded-full border border-slate-200 flex-shrink-0 flex items-center justify-center bg-white shadow-sm">
                  <Image src="/overlayicon.png" alt="AI" width={18} height={18} />
                </div>
              )}
              <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm font-medium ${
                msg.role === 'user' ? 'bg-[#cc0033] text-white rounded-tr-none' : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* ADDED: THINKING PHASE UI */}
          {isGenerating && (
            <div className="flex items-start gap-3">
               <div className="relative w-9 h-9 flex-shrink-0">
                 <div className="absolute inset-0 rounded-full border-2 border-t-scarlet border-transparent animate-spin"></div>
                 <div className="w-full h-full rounded-full border border-slate-200 flex items-center justify-center bg-white">
                    <Image src="/overlayicon.png" alt="AI" width={18} height={18} className="opacity-50" />
                 </div>
               </div>
               <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl rounded-tl-none shadow-sm flex flex-col gap-2 min-w-[200px]">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-scarlet/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Analyzing Prompt...</span>
               </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <input 
              type="text" 
              placeholder={userEmail ? `Hello ${userName?.split(' ')[0]}, ask Scarlet AI anything...` : "Ask Scarlet AI anything..."}
              className="w-full p-5 pr-20 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-2xl focus:border-scarlet outline-none transition-all placeholder:text-slate-400 font-medium"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-3 bottom-3 bg-[#cc0033] text-white px-5 rounded-xl font-bold hover:bg-[#990026] shadow-md transition-all active:scale-95">
              <span className="hidden sm:inline text-sm uppercase">Send</span>
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-500 mt-4 font-bold uppercase tracking-[0.2em]">Official Interface • Rutgers Software Engineering</p>
        </div>
      </main>
    </div>
  );
}