import { createServerClient } from '@supabase/ssr';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Browser client (use in Client Components) ─────────────────────────────────
export function createClient() {
  return createBrowserClient(url, anon);
}

// ── Server client (use in Server Components, Route Handlers, middleware) ───────
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll:    () => cookieStore.getAll(),
      setAll: (pairs) => pairs.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      ),
    },
  });
}

// ── Service-role client (server only, bypasses RLS) ───────────────────────────
export function createServiceClient() {
  const { createClient: createSB } = require('@supabase/supabase-js');
  return createSB(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
