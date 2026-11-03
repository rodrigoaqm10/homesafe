'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export type LoginState = { error: string };
export async function login(
  _previous: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length === 0 ||
    password.length > 128
  )
    return { error: 'Revisa el correo y la contraseña.' };
  try {
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
      return {
        error:
          'No pudimos iniciar sesión. Verifica tus datos o inténtalo más tarde.',
      };
  } catch {
    return {
      error:
        'El acceso no está disponible en este momento. Inténtalo más tarde.',
    };
  }
  redirect('/portal');
}
export async function logout() {
  const client = await createClient();
  await client.auth.signOut({ scope: 'local' });
  redirect('/acceso');
}
