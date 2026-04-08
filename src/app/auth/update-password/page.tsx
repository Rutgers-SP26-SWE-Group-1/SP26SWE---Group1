'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-zA-Z]/.test(password)) score++; 
    if (/[0-9]/.test(password)) score++;    
    if (/[!@#$%^&*]/.test(password)) score++; 
    return score;
  };

  const strength = getStrength();

  const getBarColor = (index: number) => {
    if (strength < index) return 'bg-[var(--card-border)]';
    if (strength <= 2) return 'bg-red-500';
    if (strength === 3) return 'bg-amber-400';
    return 'bg-green-500';
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check 1: Do passwords match?
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // Check 2: Is the password strong enough?
    if (strength < 4) {
      setError("Please ensure your password is 'Strong' before updating.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-[var(--card-bg)] p-8 rounded-2xl shadow-xl border border-[var(--card-border)] text-center relative transition-colors">
        <Link href="/profile" className="absolute left-6 top-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-scarlet transition-all">
          ← Cancel
        </Link>
        <Image src="/overlayicon.png" alt="Logo" width={50} height={50} className="mx-auto mb-4" />
        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Create New Password</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">Resetting your Scarlet AI access.</p>

        {!success ? (
          <form onSubmit={handleUpdate} className="space-y-4 text-left">
            {/* Primary Password Field */}
            <div>
              <label className="block text-xs font-black text-[var(--text-primary)] uppercase mb-1">New Password</label>
              <input 
                type="password" 
                placeholder="8+ chars, 1 number, 1 symbol" 
                required
                className="w-full p-3 bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--text-primary)] rounded-xl focus:border-scarlet outline-none text-sm placeholder:text-[var(--input-placeholder)] transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <div className="flex gap-1 mt-2 px-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${getBarColor(i)}`}></div>
                ))}
              </div>

              <div className="flex justify-between mt-1 px-1">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-widest">Security Strength</p>
                <p className={`text-[10px] font-bold italic ${
                  strength <= 2 ? 'text-red-500' : strength === 3 ? 'text-amber-500' : 'text-green-500'
                }`}>
                  {strength === 0 ? 'Empty' : strength <= 2 ? 'Weak' : strength === 3 ? 'Fair' : 'Strong!'}
                </p>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-black text-[var(--text-primary)] uppercase mb-1">Confirm New Password</label>
              <input 
                type="password" 
                placeholder="Repeat your new password" 
                required
                className={`w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border-2 rounded-xl outline-none text-sm transition-all ${
                  confirmPassword && password !== confirmPassword 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-[var(--input-border)] focus:border-scarlet'
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1 font-bold uppercase italic px-1 tracking-tight">
                  Passwords do not match
                </p>
              )}
            </div>

            {error && <p className="text-[var(--message-error-text)] text-[11px] font-bold text-center bg-[var(--message-error-bg)] p-2 rounded-lg border border-[var(--message-error-border)] uppercase italic">{error}</p>}

            <button 
              disabled={loading}
              className="w-full bg-[#cc0033] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#990026] transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        ) : (
          <div className="bg-[var(--message-success-bg)] border border-[var(--message-success-border)] p-4 rounded-xl">
            <p className="text-[var(--message-success-text)] font-bold uppercase text-xs">Password Updated Successfully!</p>
            <p className="text-[var(--text-secondary)] text-xs mt-2">Redirecting you to login...</p>
          </div>
        )}
      </div>
    </main>
  );
}
