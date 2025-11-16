// This file sets up the Supabase client for the app.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Prefer env vars, fall back to existing hardcoded values to ensure dev works.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lkuusjhtuqbnjoxpswyc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdXVzamh0dXFibmpveHBzd3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjA1NDMsImV4cCI6MjA3ODIzNjU0M30.IHWPbdg7xlyZeDWWSDVl8smEhZdSW2EThIJ5VZ8mzKc";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});