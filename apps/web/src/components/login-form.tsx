'use client';
import { useActionState } from 'react';
import { login } from '@/app/acceso/actions';
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: '' });
  return (
    <form action={action} className="secure-form">
      {state.error && (
        <p className="error-notice" role="alert">
          {state.error}
        </p>
      )}
      <label>
        Correo electrónico
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      <button className="button primary" disabled={pending} type="submit">
        {pending ? 'Verificando acceso…' : 'Ingresar a mi comunidad'}
      </button>
      <p>
        Acceso por invitación. Tu perfil lo determina la membresía de tu
        comunidad.
      </p>
    </form>
  );
}
