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
  const [step, setStep] = useState(0);
  const [chatIdx, setChatIdx] = useState(0);
  const [messages, setMessages] = useState<{ type: 'user' | 'ai'; text: string }[]>([]);
  const [currentTyping, setCurrentTyping] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (step === 0) {
      timer = setTimeout(() => {
        setMessages([]);
        setCurrentTyping('');
        setIsTyping(false);
        setStep(1);
      }, messages.length === 0 ? 1000 : 4000);

    } else if (step === 1) {
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
        timer = setTimeout(() => {
          setMessages([{ type: 'user', text: fullText }]);
          setIsTyping(false);
          setCurrentTyping('');
          setStep(2);
        }, 800);
      }

    } else if (step === 2) {
      timer = setTimeout(() => setStep(3), 600);

    } else if (step === 3) {
      if (!isTyping) setIsTyping(true);
      timer = setTimeout(() => {
        setIsTyping(false);
        setStep(4);
      }, 2500);

    } else if (step === 4) {
      if (!isTyping) {
        setIsTyping(true);
        setCurrentTyping('');
      }
      const fullResponse = SAMPLE_CHATS[chatIdx].response;
      if (currentTyping.length < fullResponse.length) {
        timer = setTimeout(() => {
          setCurrentTyping(fullResponse.slice(0, currentTyping.length + 1));
        }, 30);
      } else {
        timer = setTimeout(() => {
          setMessages(prev => [...prev, { type: 'ai', text: fullResponse }]);
          setIsTyping(false);
          setCurrentTyping('');
          setChatIdx((prev) => (prev + 1) % SAMPLE_CHATS.length);
          setStep(0);
        }, 4000);
      }
    }

    return () => clearTimeout(timer);
  }, [step, currentTyping, chatIdx, messages.length, isTyping]);

  return (
    <main className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-6 py-16 selection:bg-scarlet/20">

      {/* Hero */}
      <div
        className="mb-14 text-center flex flex-col items-center"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.8s cubic-bezier(.16,1,.3,1), transform 0.8s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div className="relative w-56 h-56 mb-4">
          <Image src="/landingicon.png" alt="Logo" fill className="object-contain" priority />
        </div>
        <p className="text-[#86868b] text-base font-medium tracking-tight max-w-sm leading-relaxed">
          The official AI interface for the Rutgers community.
        </p>
      </div>

      {/* Showcase */}
      <div
        className="w-full max-w-2xl rounded-[28px] mb-14 p-[1px] relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(204,0,51,0.25), rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.06) 60%, rgba(204,0,51,0.15))',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 0.8s cubic-bezier(.16,1,.3,1) 0.15s, transform 0.8s cubic-bezier(.16,1,.3,1) 0.15s',
        }}
      >
        <div
          className="rounded-[27px] bg-white p-7"
          style={{ boxShadow: '0 4px 60px -16px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)' }}
        >
        <div className="flex flex-col space-y-5 min-h-[220px]">
          {/* Rendered messages */}
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.type === 'user' ? 'flex justify-end' : 'flex items-end gap-2.5'}>
              {msg.type === 'user' ? (
                <div
                  className="text-white px-5 py-3 rounded-[22px] rounded-br-sm text-[15px] font-normal leading-[1.45] shadow-md max-w-[80%]"
                  style={{ background: 'linear-gradient(135deg, #cc0033 0%, #a30026 100%)' }}
                >
                  {msg.text}
                </div>
              ) : (
                <>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e8e8ed] flex items-center justify-center shadow-sm">
                    <div className="relative w-[18px] h-[18px]">
                      <Image src="/overlayicon.png" alt="AI" fill className="object-contain" />
                    </div>
                  </div>
                  <div className="bg-[#e8e8ed] px-5 py-3 rounded-[22px] rounded-bl-sm text-[15px] leading-[1.45] max-w-[80%] shadow-sm">
                    <span className="text-[#1d1d1f] font-normal">{msg.text}</span>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Typing animations */}
          {isTyping && (
            <>
              {step === 1 && (
                <div className="flex justify-end"
                  style={{ opacity: 1, transform: 'translateY(0) scale(1)', transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(.16,1,.3,1)' }}
                >
                  <div
                    className="text-white px-5 py-3 rounded-[22px] rounded-br-sm text-[15px] font-normal leading-[1.45] shadow-md max-w-[80%]"
                    style={{ background: 'linear-gradient(135deg, #cc0033 0%, #a30026 100%)' }}
                  >
                    {currentTyping}
                    <span className="animate-pulse ml-0.5 font-light">|</span>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="flex items-end gap-2.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e8e8ed] flex items-center justify-center shadow-sm">
                    <div className="relative w-[18px] h-[18px]">
                      <Image src="/overlayicon.png" alt="AI" fill className="object-contain" />
                    </div>
                  </div>
                  <div className="bg-[#e8e8ed] px-5 py-3 rounded-[22px] rounded-bl-sm text-[15px] leading-[1.45] max-w-[80%] min-h-[44px] shadow-sm">
                    <div className="flex gap-[5px] items-center h-[22px]">
                      <div className="w-2 h-2 bg-[#8e8e93] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#8e8e93] rounded-full animate-bounce [animation-delay:0.15s]"></div>
                      <div className="w-2 h-2 bg-[#8e8e93] rounded-full animate-bounce [animation-delay:0.3s]"></div>
                    </div>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="flex items-end gap-2.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e8e8ed] flex items-center justify-center shadow-sm">
                    <div className="relative w-[18px] h-[18px]">
                      <Image src="/overlayicon.png" alt="AI" fill className="object-contain" />
                    </div>
                  </div>
                  <div className="bg-[#e8e8ed] px-5 py-3 rounded-[22px] rounded-bl-sm text-[15px] leading-[1.45] max-w-[80%] shadow-sm">
                    <span className="text-[#1d1d1f] font-normal">
                      {currentTyping}
                      <span className="inline-block w-[2px] h-[18px] bg-[#8e8e93] ml-0.5 animate-pulse align-text-bottom" />
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      {/* CTAs */}
      <div
        className="flex flex-col gap-3 w-full max-w-sm"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 0.8s cubic-bezier(.16,1,.3,1) 0.3s, transform 0.8s cubic-bezier(.16,1,.3,1) 0.3s',
        }}
      >
        <Link
          href="/login"
          className="w-full bg-scarlet text-white text-center py-4 rounded-2xl font-bold text-[17px] tracking-tight hover:brightness-110 active:scale-[0.98] transition-all duration-200"
        >
          LOGIN WITH SCARLETMAIL
        </Link>
        <div className="flex gap-3 w-full">
          <Link
            href="/signup"
            className="flex-1 bg-white text-scarlet text-center py-3.5 rounded-2xl font-bold text-[15px] tracking-tight border border-[#d2d2d7] hover:bg-[#f5f5f7] active:scale-[0.98] transition-all duration-200"
          >
            CREATE ACCOUNT
          </Link>
          <Link
            href="/chat"
            className="flex-1 bg-[#1d1d1f] text-white text-center py-3.5 rounded-2xl font-bold text-[15px] tracking-tight hover:bg-[#333336] active:scale-[0.98] transition-all duration-200"
          >
            GUEST ACCESS
          </Link>
        </div>
      </div>

      <p className="mt-12 text-[11px] text-[#86868b] font-medium tracking-widest uppercase">
        Rutgers University Restricted Access
      </p>
    </main>
  );
}

export default LandingPage;
