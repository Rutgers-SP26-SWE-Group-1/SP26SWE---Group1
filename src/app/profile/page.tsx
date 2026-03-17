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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-[12px] font-black uppercase tracking-widest text-slate-400">
      Loading Scarlet Profile...
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 py-12 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header Branding */}
        <div className="bg-[#cc0033] p-10 text-white flex flex-col items-center relative text-center">
          <Link href="/chat" className="absolute left-6 top-8 text-white/80 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all">
            ← Back to Chat
          </Link>
          <div className="w-30 h-30 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center mb-6 shadow-inner">
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
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 tracking-widest">Email (Locked)</label>
              <input type="text" value={email} disabled className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-xl text-sm font-bold cursor-not-allowed text-slate-500" />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-2 tracking-widest">Full Name</label>
              <input 
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm font-bold transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-2 tracking-widest">Major</label>
              <select 
                value={major} onChange={(e) => setMajor(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm font-bold appearance-none cursor-pointer"
              >
                {RUTGERS_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-2 tracking-widest">Class Year</label>
              <select 
                value={year} onChange={(e) => setYear(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm font-bold appearance-none cursor-pointer"
              >
                {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-10 flex flex-col items-center gap-8">
             {/* UPDATED: More readable password link with higher contrast and larger text */}
             <Link href="/auth/update-password" 
                className="text-[13px] font-black text-[#cc0033] uppercase tracking-[0.2em] hover:text-[#990026] transition-all border-b-2 border-scarlet/30 hover:border-scarlet pb-1">
                Change Account Password
             </Link>

             {message.text && (
               <div className={`w-full p-4 rounded-xl border text-center text-[11px] font-black uppercase tracking-wider ${
                 message.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'
               }`}>
                 {message.text}
               </div>
             )}

             <button 
              type="submit"
              disabled={updating}
              className="w-full md:w-auto bg-slate-900 text-white px-24 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.25em] hover:bg-black transition-all shadow-2xl disabled:opacity-50 active:scale-95"
             >
               {updating ? 'SAVING CHANGES...' : 'SAVE PROFILE'}
             </button>
          </div>
        </form>
      </div>
    </main>
  );
}