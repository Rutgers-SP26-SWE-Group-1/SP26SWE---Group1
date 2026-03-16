'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { validateSignup } from '@/lib/auth-logic';

const RUTGERS_MAJORS = [
  "Computer Science", "Electrical & Computer Engineering", "Mechanical Engineering", 
  "Business/Finance", "Biological Sciences", "Psychology", "Economics", "Other"
];

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

export default function SignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Added confirm password state
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('Freshman');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (strength < index) return 'bg-slate-200';
    if (strength <= 2) return 'bg-red-500';
    if (strength === 3) return 'bg-amber-400';
    return 'bg-green-500';
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Extra check: Do passwords match?
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

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
        body: JSON.stringify({ 
          email, 
          password, 
          fullName: `${firstName} ${lastName}`,
          major,
          year 
        }), 
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('already registered')) {
          setError('This email is already in use. Please log in instead.');
        } else {
          setError(data.error || 'Something went wrong');
        }
      } else {
        alert('Verification email sent! Please check your Scarletmail.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <Link href="/" className="text-[#990026] font-bold mb-4 inline-block hover:underline">← Back</Link>
        
        <div className="flex flex-col items-center mb-6">
          <Image src="/overlayicon.png" alt="Logo" width={50} height={50} />
          <h2 className="text-2xl font-black mt-2 text-slate-900 text-center leading-tight">Join the Wave</h2>
          <p className="text-slate-600 text-sm font-medium">Create your Scarlet AI account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">First Name</label>
              <input 
                type="text" placeholder="Ved" required
                className="w-full p-3 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm placeholder:text-slate-500"
                value={firstName} onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Last Name</label>
              <input 
                type="text" placeholder="Patel" required
                className="w-full p-3 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm placeholder:text-slate-500"
                value={lastName} onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-[2]">
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Major</label>
              <select 
                required
                className="w-full p-3 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm"
                value={major} onChange={(e) => setMajor(e.target.value)}
              >
                <option value="" className="text-slate-500">Select Major</option>
                {RUTGERS_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Year</label>
              <select 
                className="w-full p-3 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm"
                value={year} onChange={(e) => setYear(e.target.value)}
              >
                {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">Rutgers Email</label>
            <input 
              type="email" placeholder="netid@scarletmail.rutgers.edu" required
              className="w-full p-3 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm placeholder:text-slate-500"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">Password</label>
            <input 
              type="password" 
              placeholder="8+ chars, 1 number, 1 symbol" 
              required
              className="w-full p-3 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm placeholder:text-slate-500"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            
            {/* Strength Meter Bars */}
            <div className="flex gap-1 mt-2">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${getBarColor(i)}`}></div>
              ))}
            </div>

            {/* Strength Text Labels */}
            <div className="flex justify-between mt-1 px-1">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Strength</p>
              <p className={`text-[10px] font-bold italic ${
                strength <= 2 ? 'text-red-500' : strength === 3 ? 'text-amber-500' : 'text-green-500'
              }`}>
                {strength === 0 ? 'Empty' : strength <= 2 ? 'Weak' : strength === 3 ? 'Fair' : 'Strong!'}
              </p>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">Confirm Password</label>
            <input 
              type="password" 
              placeholder="Repeat your password" 
              required
              className={`w-full p-3 bg-slate-50 border-2 rounded-xl outline-none text-sm transition-all ${
                confirmPassword && password !== confirmPassword 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-slate-300 focus:border-scarlet'
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
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-[11px] font-bold uppercase text-center leading-tight">{error}</p>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-[#cc0033] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#990026] transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600 font-bold">
          Already a member? <Link href="/login" className="text-scarlet hover:underline">Sign In</Link>
        </p>
      </div>
    </main>
  );
}