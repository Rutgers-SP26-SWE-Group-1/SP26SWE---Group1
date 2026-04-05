'use client';

import { supabase } from '@/lib/supabase';

export default function LogoutButton() {
  const handleLogout = async () => {
    console.log("Logout button clicked!"); // Check if this appears in console

    try {
      // 1. Clear Supabase Session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Supabase signout error:", error.message);
      }

      // 2. Clear all local session data
      localStorage.clear();
      sessionStorage.clear();

      console.log("Auth cleared, redirecting to home...");

      // 3. Force redirect to landing page
      window.location.replace('/'); 
    } catch (err) {
      console.error("Critical logout failure:", err);
    }
  };

  return (
  <button 
    onClick={handleLogout}
    // Added 'justify-center' and 'mx-auto'
    className="w-full flex items-center justify-center gap-2 p-3 mt-auto text-app-muted hover:text-scarlet hover:bg-red-50/60 rounded-xl transition-all font-bold"
  >
    <span className="text-lg">←</span> Log Out
  </button>
);
}
