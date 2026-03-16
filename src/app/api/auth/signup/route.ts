import { NextResponse } from 'next/server';
import { validateSignup } from '@/lib/auth-logic';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    // UPDATED: Destructure the new fields from the request
    const { email, password, fullName, major, year } = await request.json();

    const validation = validateSignup(email, password);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // UPDATED: Pass the metadata into the signUp options
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`,
        // This is where the magic happens for your profile display
        data: {
          full_name: fullName,
          major: major,
          class_year: year,
        },
      },
    });

    if (error) {
      // Friendly error mapping for existing users
      if (error.message.includes("already registered")) {
        return NextResponse.json({ error: "This email is already in use. Please log in instead." }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: "Success! Rutgers verification email sent.",
      user: data.user 
    });

  } catch (err) {
    console.error("Signup Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}