'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function VerifyNotice() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#cc0033] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Check your Inbox</h2>
        <p className="text-slate-600 font-medium mb-6"> We sent a verification link to your <span className="text-scarlet font-bold">Scarletmail</span>. Please click it to activate your account.</p>
        <Link href="/login" className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-scarlet transition-colors">
          Back to Login
        </Link>
      </div>
    </main>
  );
}