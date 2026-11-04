'use client';
import { useActionState } from 'react';
import { addShiftNote } from '@/app/portal/logbook-actions';
import { generateShiftSummary } from '@/app/portal/shift-summary-actions';
import { SubmitButton } from './submit-button';

export function ShiftSummary({
  membershipId,
  canSave,
}: {
  membershipId: string;
  canSave: boolean;
}) {
  const [state, generate] = useActionState(generateShiftSummary, {});
  return (
    <section className="panel logbook-entry">
      <h2>Resumen de turno con IA</h2>
      <p>
        Genera un borrador con los conteos actuales de visitas, encomiendas y
        solicitudes. Revisa el texto antes de usarlo.
      </p>
      <form action={generate}>
        <input type="hidden" name="membership_id" value={membershipId} />
        <SubmitButton>Generar borrador</SubmitButton>
      </form>
      {state.error && (
        <p className="error-notice" role="alert">
          {state.error}
        </p>
      )}
      {state.draft &&
        (canSave ? (
          <form action={addShiftNote} className="secure-form" key={state.draft}>
            <input type="hidden" name="membership_id" value={membershipId} />
            <label>
              Borrador de turno
              <textarea
                name="body"
                defaultValue={state.draft}
                minLength={3}
                maxLength={2000}
                rows={6}
                required
              />
            </label>
            <SubmitButton>Guardar en la bitácora</SubmitButton>
          </form>
        ) : (
          <pre className="shift-draft">{state.draft}</pre>
        ))}
    </section>
  );
}
