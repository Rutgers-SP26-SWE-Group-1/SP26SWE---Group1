'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AuthConfirmed() {
  const router = useRouter();

  useEffect(() => {
    // Automatically send them to the chat hub after 4 seconds
    const timer = setTimeout(() => router.push('/chat'), 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
           {/* Success Ring Animation */}
           <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-20"></div>
           <div className="relative w-full h-full bg-green-500 rounded-full flex items-center justify-center shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
             </svg>
           </div>
        </div>
        
        <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-2">Verified!</h1>
        <p className="text-[var(--text-secondary)] font-bold uppercase text-[10px] tracking-[0.2em]">Welcome to the Scarlet AI Community</p>
        
        <div className="mt-10 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[var(--card-border)] border-t-scarlet rounded-full animate-spin"></div>
            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Redirecting to Chat Hub...</p>
        </div>
      </div>
    </main>
  );
}
