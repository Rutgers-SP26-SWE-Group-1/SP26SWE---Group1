'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Update the user's password in Supabase
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Give them a moment to see the success message before redirecting
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
        <Image src="/overlayicon.png" alt="Logo" width={50} height={50} className="mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Create New Password</h2>
        <p className="text-slate-500 text-sm mb-6">Enter your new Rutgers Scarlet AI password below.</p>

        {!success ? (
          <form onSubmit={handleUpdate} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">New Password</label>
              <input 
                type="password" 
                placeholder="8+ chars, 1 number, 1 symbol" 
                required
                className="w-full p-3 bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-xl focus:border-scarlet outline-none text-sm placeholder:text-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-red-600 text-xs font-bold text-center">{error}</p>}

            <button 
              disabled={loading}
              className="w-full bg-[#cc0033] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#990026] transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        ) : (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
            <p className="text-green-700 font-bold uppercase text-xs">Password Updated Successfully!</p>
            <p className="text-slate-500 text-xs mt-2">Redirecting you to login...</p>
          </div>
        )}
      </div>
    </main>
  );
}