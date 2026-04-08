'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email.endsWith('@scarletmail.rutgers.edu')) {
      setError('Please use your Rutgers Scarletmail email address.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/chat');
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.endsWith('@scarletmail.rutgers.edu')) {
      setError("Please enter your Rutgers email address first.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Reset link sent! Please check your Scarletmail.");
    }
    setLoading(false);
  };

  const inputBase =
    'w-full h-[50px] px-4 bg-[var(--input-bg)] text-[var(--text-primary)] text-[15px] rounded-xl border border-[var(--input-border)] outline-none transition-all duration-200 placeholder:text-[var(--input-placeholder)] focus:border-scarlet focus:ring-2 focus:ring-scarlet/20';

  return (
    <main className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center px-4 py-12 transition-colors">
      <div
        className="w-full max-w-[440px] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-8 sm:p-10 transition-colors"
        style={{ boxShadow: '0 4px 60px -16px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)' }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] text-[var(--text-secondary)] font-medium hover:text-scarlet transition-colors duration-200 mb-8"
        >
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mt-px">
            <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface-soft)] flex items-center justify-center mb-4 transition-colors">
            <Image src="/overlayicon.png" alt="Scarlet AI" width={32} height={32} />
          </div>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">Welcome Back</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">Sign in to your Rutgers Scarlet AI account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5 ml-1">Email</label>
            <input
              type="email"
              placeholder="netid@scarletmail.rutgers.edu"
              className={inputBase}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className={inputBase}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-scarlet mt-2 block w-full text-right tracking-wide transition-colors duration-200"
            >
              Forgot Password?
            </button>
          </div>

          {error && (
            <div className="bg-[var(--message-error-bg)] border border-[var(--message-error-border)] rounded-xl px-4 py-3">
              <p className="text-[var(--message-error-text)] text-[13px] font-medium text-center">{error}</p>
            </div>
          )}
          {message && (
            <div className="bg-[var(--message-success-bg)] border border-[var(--message-success-border)] rounded-xl px-4 py-3">
              <p className="text-[var(--message-success-text)] text-[13px] font-medium text-center">{message}</p>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full h-[50px] text-white text-[16px] font-semibold tracking-tight rounded-xl hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 mt-2"
            style={{ background: 'linear-gradient(135deg, #cc0033 0%, #a30026 100%)' }}
          >
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-[var(--text-secondary)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-scarlet font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </main>
  );
}
