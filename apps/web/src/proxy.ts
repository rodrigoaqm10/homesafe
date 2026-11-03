import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { sessionCookieOptions } from '@/lib/supabase/cookie-options';
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const development = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const pending: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (
    url &&
    key &&
    request.cookies.getAll().some((c) => c.name.startsWith('sb-')) &&
    ['/portal', '/seguridad', '/acceso'].some((path) =>
      request.nextUrl.pathname.startsWith(path),
    )
  ) {
    const client = createServerClient(url, key, {
      cookieOptions: sessionCookieOptions(
        process.env.APP_ORIGIN,
        process.env.NODE_ENV === 'production',
      ),
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          for (const cookie of values) {
            request.cookies.set(cookie.name, cookie.value);
            pending.push(cookie);
          }
        },
      },
    });
    await client.auth.getUser();
    headers.set('cookie', request.headers.get('cookie') ?? '');
  }
  const response = NextResponse.next({ request: { headers } });
  for (const { name, value, options } of pending)
    response.cookies.set(name, value, options);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
