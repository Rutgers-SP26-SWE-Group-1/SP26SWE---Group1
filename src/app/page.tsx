'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const SAMPLE_CHATS = [
  { prompt: "What is Software Engineering?", response: "The systematic application of engineering principles to software development." },
  { prompt: "Will AI take over my job?", response: "AI is a tool to enhance human productivity, not replace the need for engineering logic!" },
  { prompt: "How do I succeed at Rutgers?", response: "Stay curious, attend your SWE lectures, and keep building great projects like this!" }
];

function LandingPage() {
  const [step, setStep] = useState(0); // 0: Reset/Wait, 1: User Typing, 2: Sent, 3: AI Thinking, 4: AI Typing
  const [chatIdx, setChatIdx] = useState(0);
  const [messages, setMessages] = useState<{ type: 'user' | 'ai'; text: string }[]>([]); // Array of {type: 'user' | 'ai', text: string}
  const [currentTyping, setCurrentTyping] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (step === 0) {
      if (messages.length === 0) {
        // Start first prompt
        timer = setTimeout(() => setStep(1), 1000);
      } else {
        // After last response, wait then reset for next cycle
        timer = setTimeout(() => {
          setMessages([]);
          setStep(1);
        }, 4000);
      }
    } else if (step === 1) {
      // User Typing
      if (!isTyping) {
        setIsTyping(true);
        setCurrentTyping('');
      }
      const fullText = SAMPLE_CHATS[chatIdx].prompt;
      if (currentTyping.length < fullText.length) {
        timer = setTimeout(() => {
          setCurrentTyping(fullText.slice(0, currentTyping.length + 1));
        }, 40);
      } else {
        setIsTyping(false);
        setMessages(prev => [...prev, { type: 'user', text: currentTyping }]);
        timer = setTimeout(() => setStep(2), 800);
      }
    } else if (step === 2) {
      // Sent - Pause
      timer = setTimeout(() => setStep(3), 400);
    } else if (step === 3) {
      // AI Thinking
      if (!isTyping) {
        setIsTyping(true);
        setCurrentTyping('');
      }
      timer = setTimeout(() => setStep(4), 2000);
    } else if (step === 4) {
      // AI Typing
      const fullResponse = SAMPLE_CHATS[chatIdx].response;
      if (currentTyping.length < fullResponse.length) {
        timer = setTimeout(() => {
          setCurrentTyping(fullResponse.slice(0, currentTyping.length + 1));
        }, 25);
      } else {
        setIsTyping(false);
        setMessages(prev => [...prev, { type: 'ai', text: currentTyping }]);
        timer = setTimeout(() => {
          setStep(0);
          setChatIdx((prev) => (prev + 1) % SAMPLE_CHATS.length);
        }, 4000);
      }
    }

    return () => clearTimeout(timer);
  }, [step, currentTyping, chatIdx, messages.length, isTyping]);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-10 text-center flex flex-col items-center">
        <div className="relative w-72 h-72 mb-2">
          <Image src="/landingicon.png" alt="Logo" fill className="object-contain" priority />
        </div>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-semibold">
          The official AI interface for the Rutgers community.
        </p>
      </div>

      {/* The Showcase Box */}
      <div className="w-full max-w-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl mb-10 p-8 relative overflow-hidden">
        <div className="flex flex-col space-y-6 min-h-[260px]">
          {/* Render accumulated messages */}
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.type === 'user' ? '' : 'flex items-start gap-4'}>
              {msg.type === 'user' ? (
                <div className="bg-blue-600 text-white self-end p-4 rounded-2xl rounded-tr-none text-sm font-medium max-w-[80%] shadow-md">
                  {msg.text}
                </div>
              ) : (
                <>
                  <div className="relative flex-shrink-0 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-inner border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <div className="relative w-8 h-8">
                      <Image src="/overlayicon.png" alt="AI" fill className="object-contain p-1" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 self-start p-5 rounded-2xl rounded-tl-none text-sm border border-slate-200 dark:border-slate-700 shadow-sm w-full max-w-[80%]">
                    <span className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                      {msg.text}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Current typing animation */}
          {isTyping && (
            <>
              {step === 1 && (
                <div className="bg-blue-600 text-white self-end p-4 rounded-2xl rounded-tr-none text-sm font-medium max-w-[80%] shadow-md">
                  {currentTyping}
                  <span className="animate-pulse ml-0.5 font-thin">|</span>
                </div>
              )}
              {step === 3 && (
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-inner border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-t-scarlet border-transparent animate-spin"></div>
                    <div className="relative w-8 h-8">
                      <Image src="/overlayicon.png" alt="AI" fill className="object-contain p-1" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 self-start p-5 rounded-2xl rounded-tl-none text-sm border border-slate-200 dark:border-slate-700 shadow-sm w-full max-w-[80%] min-h-[60px]">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1 h-5 items-center">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <span className="text-slate-400 italic text-xs uppercase tracking-widest font-bold">Analyzing Prompt...</span>
                    </div>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-inner border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <div className="relative w-8 h-8">
                      <Image src="/overlayicon.png" alt="AI" fill className="object-contain p-1" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 self-start p-5 rounded-2xl rounded-tl-none text-sm border border-slate-200 dark:border-slate-700 shadow-sm w-full max-w-[80%]">
                    <span className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                      {currentTyping}
                      <span className="inline-block w-1.5 h-4 bg-scarlet ml-1 animate-pulse" />
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-md">
        <Link href="/login" className="w-full bg-[#cc0033] text-white text-center py-5 rounded-2xl font-black text-xl hover:bg-[#990026] transition-all shadow-xl active:scale-95 border-b-4 border-red-900">
          LOGIN WITH SCARLETMAIL
        </Link>
        <div className="flex gap-4 w-full">
          <Link href="/signup" className="flex-1 bg-white border-2 border-[#cc0033] text-[#cc0033] text-center py-4 rounded-2xl font-black text-lg hover:bg-red-50 transition-all border-b-4 border-red-100">
            CREATE ACCOUNT
          </Link>
          <Link href="/chat" className="flex-1 bg-slate-900 text-white text-center py-4 rounded-2xl font-black text-lg hover:bg-black transition-all border-b-4 border-slate-700">
            GUEST ACCESS
          </Link>
        </div>
      </div>
      <p className="mt-10 text-xs text-slate-500 font-bold uppercase tracking-widest">
        Rutgers University Restricted Access
      </p>
    </main>
  );
}

export default LandingPage;