'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function VerifyNotice() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-[var(--card-bg)] p-8 rounded-3xl shadow-xl border border-[var(--card-border)] text-center transition-colors">
        <div className="w-20 h-20 bg-[var(--surface-soft)] rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#cc0033] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Check your Inbox</h2>
        <p className="text-[var(--text-secondary)] font-medium mb-6"> We sent a verification link to your <span className="text-scarlet font-bold">Scarletmail</span>. Please click it to activate your account.</p>
        <Link href="/login" className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-scarlet transition-colors">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
