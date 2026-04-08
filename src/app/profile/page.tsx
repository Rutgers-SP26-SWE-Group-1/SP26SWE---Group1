'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const RUTGERS_MAJORS = ["Computer Science", "Electrical & Computer Engineering", "Mechanical Engineering", "Business/Finance", "Biological Sciences", "Psychology", "Economics", "Other"];
const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setFullName(user.user_metadata?.full_name || '');
        setMajor(user.user_metadata?.major || '');
        setYear(user.user_metadata?.class_year || '');
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    getProfile();
  }, [router]);

  useEffect(() => {
    const currentTheme =
      typeof window !== 'undefined' && window.localStorage.getItem('scarlet-theme') === 'dark'
        ? 'dark'
        : 'light';

    setTheme(currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('scarlet-theme', nextTheme);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ text: '', type: '' });

    const { error } = await supabase.auth.updateUser({
      data: { 
        full_name: fullName, 
        major: major, 
        class_year: year 
      }
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    }
    setUpdating(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)]">
      Loading Scarlet Profile...
    </div>
  );

  return (
    <main className="min-h-screen bg-[var(--app-bg)] p-4 py-12 font-sans transition-colors">
      <div className="max-w-2xl mx-auto bg-[var(--card-bg)] rounded-3xl shadow-xl border border-[var(--card-border)] overflow-hidden transition-colors">
        
        {/* Header Branding */}
        <div className="bg-[#cc0033] p-10 text-white flex flex-col items-center relative text-center">
          <Link href="/chat" className="absolute left-6 top-8 text-white/80 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all">
            ← Back to Chat
          </Link>
          <button
            type="button"
            onClick={handleThemeToggle}
            className="absolute right-6 top-6 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-all hover:bg-white/25"
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center mb-6 shadow-inner">
            <Image src="/websiteicon.png" alt="Profile" width={60} height={60} className="brightness-200 opacity-80" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight leading-none">{fullName || 'Scarlet Knight'}</h1>
          
          {/* UPDATED: Larger, clearer sub-header text */}
          <p className="text-white font-bold uppercase text-[14px] tracking-[0.25em] mt-4 opacity-90">
            {major || 'Student'} <span className="mx-2">•</span> {year}
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="opacity-70">
              <label className="block text-[11px] font-black text-[var(--text-secondary)] uppercase mb-2 tracking-widest">Email (Locked)</label>
              <input type="text" value={email} disabled className="w-full p-4 bg-[var(--surface-muted)] border-2 border-[var(--card-border)] rounded-xl text-sm font-bold cursor-not-allowed text-[var(--text-secondary)] transition-colors" />
            </div>

            <div>
              <label className="block text-[11px] font-black text-[var(--text-primary)] uppercase mb-2 tracking-widest">Full Name</label>
              <input 
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full p-4 bg-[var(--surface-soft)] border-2 border-[var(--card-border)] text-[var(--text-primary)] rounded-xl focus:border-scarlet outline-none text-sm font-bold transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-[var(--text-primary)] uppercase mb-2 tracking-widest">Major</label>
              <select 
                value={major} onChange={(e) => setMajor(e.target.value)}
                className="w-full p-4 bg-[var(--surface-soft)] border-2 border-[var(--card-border)] text-[var(--text-primary)] rounded-xl focus:border-scarlet outline-none text-sm font-bold appearance-none cursor-pointer transition-colors"
              >
                {RUTGERS_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-[var(--text-primary)] uppercase mb-2 tracking-widest">Class Year</label>
              <select 
                value={year} onChange={(e) => setYear(e.target.value)}
                className="w-full p-4 bg-[var(--surface-soft)] border-2 border-[var(--card-border)] text-[var(--text-primary)] rounded-xl focus:border-scarlet outline-none text-sm font-bold appearance-none cursor-pointer transition-colors"
              >
                {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-[var(--card-border)] pt-10 flex flex-col items-center gap-8 transition-colors">
             {/* UPDATED: More readable password link with higher contrast and larger text */}
             <Link href="/auth/update-password" 
                className="text-[13px] font-black text-[#cc0033] uppercase tracking-[0.2em] hover:text-[#990026] transition-all border-b-2 border-scarlet/30 hover:border-scarlet pb-1">
                Change Account Password
             </Link>

             {message.text && (
               <div className={`w-full p-4 rounded-xl border text-center text-[11px] font-black uppercase tracking-wider ${
                 message.type === 'error'
                   ? 'bg-[var(--message-error-bg)] border-[var(--message-error-border)] text-[var(--message-error-text)]'
                   : 'bg-[var(--message-success-bg)] border-[var(--message-success-border)] text-[var(--message-success-text)]'
               }`}>
                 {message.text}
               </div>
             )}

              <button 
              type="submit"
              disabled={updating}
              className="w-full md:w-auto bg-[var(--button-neutral)] text-[var(--button-neutral-text)] px-24 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.25em] hover:bg-[var(--button-neutral-hover)] transition-all shadow-2xl disabled:opacity-50 active:scale-95"
             >
               {updating ? 'SAVING CHANGES...' : 'SAVE PROFILE'}
             </button>
          </div>
        </form>
      </div>
    </main>
  );
}
