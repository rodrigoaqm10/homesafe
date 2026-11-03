export function sessionCookieOptions(
  origin: string | undefined,
  production: boolean,
) {
  if (origin) {
    const url = new URL(origin);
    if (
      url.protocol !== 'https:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
      throw new Error('HTTPS_REQUIRED');
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: url.protocol === 'https:',
      path: '/',
    };
  }
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: production,
    path: '/',
  };
}
