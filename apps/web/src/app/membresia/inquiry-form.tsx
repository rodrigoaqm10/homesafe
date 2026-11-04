'use client';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import { sendMembershipInquiry } from './actions';
import { membershipPlans } from './plans';

const errors: Record<string, string> = {
  invalid: 'Revisa los datos y selecciona un plan.',
  unavailable: 'No pudimos enviar tu consulta. Intenta nuevamente más tarde.',
  rate: 'Espera un minuto antes de enviar otra consulta.',
};

export function InquiryForm() {
  const [status, action] = useActionState(sendMembershipInquiry, '');
  if (status === 'sent')
    return (
      <p className="success-notice" role="status">
        Tu consulta fue enviada. Te responderemos al correo que indicaste.
      </p>
    );
  return (
    <form action={action} className="secure-form">
      <label>
        Nombre
        <input
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label>
        Comunidad o edificio
        <input
          name="community"
          autoComplete="organization"
          required
          minLength={2}
          maxLength={120}
        />
      </label>
      <label>
        Correo de contacto
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Plan de interés
        <select name="plan" defaultValue="" required>
          <option value="" disabled>
            Selecciona una opción
          </option>
          {membershipPlans.map(({ id, tier, months }) => (
            <option key={id} value={id}>
              {tier} · {months} meses
            </option>
          ))}
        </select>
      </label>
      <label>
        Comentario (opcional)
        <textarea name="message" rows={4} maxLength={1200} />
      </label>
      <div hidden>
        <label>
          Sitio web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p>Usaremos tus datos para responder esta consulta.</p>
      {errors[status] && (
        <p className="error-notice" role="alert">
          {errors[status]}
        </p>
      )}
      <SubmitButton>Enviar consulta</SubmitButton>
    </form>
  );
}
