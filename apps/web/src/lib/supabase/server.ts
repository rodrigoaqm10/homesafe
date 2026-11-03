import { sessionCookieOptions } from '@/lib/supabase/cookie-options';
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function createClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');
  return createServerClient(url, key, {
    cookieOptions: sessionCookieOptions(
      process.env.APP_ORIGIN,
      process.env.NODE_ENV === 'production',
    ),
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(values) {
        try {
          for (const { name, value, options } of values)
            store.set(name, value, options);
        } catch {
          /* Proxy refreshes cookies during Server Component rendering. */
        }
      },
    },
  });
}
