'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { validateSignup } from '@/lib/auth-logic';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Calculate the strength score here (Outside the return)
 // 1. Calculate score out of 4
const getStrength = () => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-zA-Z]/.test(password)) score++; // Rule 2: Letter
  if (/[0-9]/.test(password)) score++;    // Rule 3: Number
  if (/[!@#$%^&*]/.test(password)) score++; // Rule 4: Special Char
  return score;
};

  const strength = getStrength();

  // 2. Determine color based on score
const getBarColor = (index: number) => {
  if (strength < index) return 'bg-slate-200'; // Gray for empty
  if (strength <= 2) return 'bg-red-500';      // Red for weak
  if (strength === 3) return 'bg-amber-400';   // Yellow/Orange for medium
  return 'bg-green-500';                       // Green for strong
};

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validation = validateSignup(email, password);
    if (!validation.isValid) {
      setError(validation.error ?? '');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), 
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        alert('Success! Check your Rutgers email or the Supabase Users tab.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <Link href="/" className="text-[#990026] font-bold mb-6 inline-block hover:underline">← Back</Link>
        
        <div className="flex flex-col items-center mb-8">
          <Image src="/overlayicon.png" alt="Logo" width={60} height={60} />
          <h2 className="text-2xl font-black mt-4 text-slate-900">Create Account</h2>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Rutgers Email</label>
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
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="8+ chars, 1 number, 1 symbol"
              className="w-full p-4 bg-white border-2 border-slate-300 text-slate-900 rounded-2xl focus:border-scarlet outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {/* Sequential Strength Meter */}
            <div className="flex gap-1 mt-2 px-1">
  <div className={`h-1.5 flex-1 rounded-full transition-colors ${getBarColor(1)}`}></div>
  <div className={`h-1.5 flex-1 rounded-full transition-colors ${getBarColor(2)}`}></div>
  <div className={`h-1.5 flex-1 rounded-full transition-colors ${getBarColor(3)}`}></div>
  <div className={`h-1.5 flex-1 rounded-full transition-colors ${getBarColor(4)}`}></div>
</div>

<div className="flex justify-between mt-1 px-1">
  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Security Strength</p>
  <p className={`text-[10px] font-bold italic ${
    strength <= 2 ? 'text-red-500' : strength === 3 ? 'text-amber-500' : 'text-green-500'
  }`}>
    {strength === 0 ? 'Empty' : strength <= 2 ? 'Weak' : strength === 3 ? 'Fair' : 'Strong!'}
  </p>
</div>
          </div>
          
          {error && <p className="text-red-600 text-sm font-bold">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-[#cc0033] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#990026] transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'SENDING...' : 'SEND VERIFICATION'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link href="/login" className="text-scarlet font-bold hover:underline">Login</Link>
        </p>
      </div>
    </main>
  );
}