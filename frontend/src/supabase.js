import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://upornmirfmznmxbzigkm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwb3JubWlyZm16bm14YnppZ2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNjY1MDgsImV4cCI6MjEwNjg0MjUwOH0.0o4NBnGE66mTBtE0a1MxAVr42aJ8xZ8sSYdMgNecYL0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
