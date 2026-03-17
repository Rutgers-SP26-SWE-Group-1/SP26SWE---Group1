'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { validateSignup } from '@/lib/auth-logic';

const RUTGERS_MAJORS = [
  "Computer Science", "Electrical & Computer Engineering", "Mechanical Engineering",
  "Business/Finance", "Biological Sciences", "Psychology", "Economics", "Other"
];

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

export default function SignUp() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
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

  const strengthColor =
    strength <= 2 ? '#ff3b30' : strength === 3 ? '#ff9500' : '#34c759';
  const strengthLabel =
    strength === 0 ? '' : strength <= 2 ? 'Weak' : strength === 3 ? 'Fair' : 'Strong';

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        router.push('/signup/verify-notice');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full h-[50px] px-4 bg-[#f5f5f7] text-[#1d1d1f] text-[15px] rounded-xl border border-[#d2d2d7] outline-none transition-all duration-200 placeholder:text-[#8e8e93] focus:border-scarlet focus:ring-2 focus:ring-scarlet/20';

  const selectBase = (hasValue: boolean) =>
    `${inputBase} appearance-none cursor-pointer ${hasValue ? '' : 'text-[#8e8e93]'}`;

  return (
    <main className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10"
        style={{ boxShadow: '0 4px 60px -16px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)' }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] text-[#86868b] font-medium hover:text-scarlet transition-colors duration-200 mb-8"
        >
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mt-px">
            <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-4">
            <Image src="/overlayicon.png" alt="Logo" width={32} height={32} />
          </div>
          <h2 className="text-[26px] font-bold text-[#1d1d1f] tracking-tight">Join the Wave</h2>
          <p className="text-[14px] text-[#86868b] mt-1">Create your Scarlet AI account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* First / Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5 ml-1">First Name</label>
              <input
                type="text" placeholder="Ved"
                className={inputBase}
                value={firstName} onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5 ml-1">Last Name</label>
              <input
                type="text" placeholder="Patel"
                className={inputBase}
                value={lastName} onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Major / Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5 ml-1">Major</label>
              <div className="relative">
                <select
                  className={selectBase(!!major)}
                  value={major} onChange={(e) => setMajor(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Major</option>
                  {RUTGERS_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]" width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5 ml-1">Year</label>
              <div className="relative">
                <select
                  className={selectBase(!!year)}
                  value={year} onChange={(e) => setYear(e.target.value)}
                  required
                >
                  <option value="" disabled>Select</option>
                  {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]" width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5 ml-1">Rutgers Email</label>
            <input
              type="email" placeholder="netid@scarletmail.rutgers.edu"
              className={inputBase}
              value={email} onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5 ml-1">Password</label>
            <input
              type="password"
              placeholder="8+ chars, 1 number, 1 symbol"
              className={inputBase}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required
            />

            {password.length > 0 && (
              <div className="mt-2.5 px-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-[3px] flex-1 rounded-full transition-all duration-300"
                      style={{ background: strength >= i ? strengthColor : '#e5e5ea' }}
                    />
                  ))}
                </div>
                {strengthLabel && (
                  <p
                    className="text-[11px] font-semibold mt-1 text-right transition-colors duration-300"
                    style={{ color: strengthColor }}
                  >
                    {strengthLabel}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5 ml-1">Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              className={`${inputBase} ${
                confirmPassword && password !== confirmPassword
                  ? 'border-[#ff3b30] focus:ring-[#ff3b30]/20'
                  : ''
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[#ff3b30] text-[12px] font-medium mt-1.5 ml-1">Passwords do not match</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#ff3b30]/8 border border-[#ff3b30]/20 rounded-xl px-4 py-3">
              <p className="text-[#ff3b30] text-[13px] font-medium text-center">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            disabled={loading}
            className="w-full h-[50px] text-white text-[16px] font-semibold tracking-tight rounded-xl hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 mt-2"
            style={{ background: 'linear-gradient(135deg, #cc0033 0%, #a30026 100%)' }}
          >
            {loading ? 'Processing...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-[#86868b]">
          Already a member?{' '}
          <Link href="/login" className="text-scarlet font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
