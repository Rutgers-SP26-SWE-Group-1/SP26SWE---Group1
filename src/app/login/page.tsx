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
  const [message, setMessage] = useState<string | null>(null); // NEW: For success messages
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

  // NEW: Forgot Password Function
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

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border-2 border-slate-100 rounded-3xl shadow-2xl">
        <Link href="/" className="text-[#a30026] font-bold hover:underline">← Home</Link>
        
        <div className="flex flex-col items-center my-6">
          <Image src="/overlayicon.png" alt="Scarlet AI" width={80} height={80} />
          <h1 className="text-3xl font-black mt-4 text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Sign in to your Rutgers Scarlet AI account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Email</label>
            <input 
              type="email" 
              placeholder="netid@scarletmail.rutgers.edu" 
              className="w-full p-4 bg-white border-2 border-slate-300 text-slate-900 rounded-2xl focus:border-scarlet outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-4 bg-white border-2 border-slate-300 text-slate-900 rounded-2xl focus:border-scarlet outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* Forgot Password Link */}
            <button 
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] font-black text-slate-400 hover:text-scarlet mt-2 block w-full text-right uppercase tracking-widest transition-colors"
            >
              Forgot Password?
            </button>
          </div>
          
          {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
          {message && <p className="text-green-600 text-sm font-bold text-center bg-green-50 p-3 rounded-xl border border-green-100">{message}</p>}

          <button 
            disabled={loading}
            className="w-full bg-[#cc0033] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#990026] transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account? <Link href="/signup" className="text-scarlet font-bold hover:underline">Sign Up</Link>
        </p>
      </div>
    </main>
  );
}