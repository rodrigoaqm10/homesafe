import 'server-only';
import { hasCommunityPro } from '@/modules/identity/infrastructure/community-plan';
import type { createClient } from '@/lib/supabase/server';
import type { Membership } from '@/modules/identity/infrastructure/session';
type SummaryState = { draft?: string; error?: string };
const recent = new Map<string, number>();

export async function buildShiftSummary(
  client: Awaited<ReturnType<typeof createClient>>,
  member: Membership,
): Promise<SummaryState> {
  if (member.role === 'residente' || !(await hasCommunityPro(client, member)))
    return {
      error: 'La función requiere acceso de personal y un plan Pro vigente.',
    };
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.HOME_SAFE_AI_MODEL?.trim();
  if (!key || !model)
    return { error: 'La generación de resúmenes aún no está habilitada.' };
  const timestamp = Date.now();
  for (const [id, until] of recent) if (until <= timestamp) recent.delete(id);
  if (recent.has(member.community_id) || recent.size >= 1000)
    return { error: 'Espera un minuto antes de generar otro resumen.' };
  recent.set(member.community_id, timestamp + 60_000);
  const scope = (table: string) =>
    client
      .from(table)
      .select('id', { head: true, count: 'exact' })
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id);
  const now = new Date(timestamp).toISOString();
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
  let fallback: string | undefined;
  try {
    const [parcels, visits, incidents, inside] = await Promise.all([
      scope('packages').eq('status', 'received'),
      scope('visits')
        .eq('status', 'authorized')
        .lte('valid_from', now)
        .gte('valid_until', now),
      scope('incidents').in('status', ['open', 'in_progress']),
      scope('visits').eq('status', 'arrived'),
    ]);
    if (
      [parcels, visits, incidents, inside].some(
        (item) => item.error || item.count === null,
      )
    )
      throw new Error('COUNTS_UNAVAILABLE');
    fallback = [
      'Resumen de turno · ' + today,
      'Encomiendas por retirar: ' + parcels.count,
      'Visitas autorizadas vigentes: ' + visits.count,
      'Visitas dentro: ' + inside.count,
      'Solicitudes activas: ' + incidents.count,
    ].join('\n');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 500,
        instructions:
          'Redacta en español chileno un resumen breve para el cambio de turno de conserjería. Usa todos los conteos tal como aparecen. No inventes nombres, hechos, riesgos ni tareas. Usa texto simple y máximo seis líneas.',
        input: JSON.stringify({
          fecha: today,
          encomiendasPorRetirar: parcels.count,
          visitasAutorizadasVigentes: visits.count,
          visitasDentro: inside.count,
          solicitudesActivas: incidents.count,
        }),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { code?: string; type?: string };
      } | null;
      const code = payload?.error?.code;
      const reason =
        payload?.error?.type === 'insufficient_quota' ||
        [
          'insufficient_quota',
          'billing_hard_limit_reached',
          'credit_balance_exhausted',
          'organization_spend_limit_exceeded',
          'project_spend_limit_exceeded',
          'organization_usage_limit_exceeded',
        ].includes(code ?? '')
          ? 'OpenAI indicó que el proyecto no tiene cuota disponible. Revisa los créditos y los límites de uso del proyecto en OpenAI.'
          : response.status === 401
            ? 'OpenAI rechazó la clave. Revisa OPENAI_API_KEY en Vercel y vuelve a desplegar.'
            : response.status === 403 || response.status === 404
              ? 'OpenAI no permitió usar el modelo. Revisa HOME_SAFE_AI_MODEL y los permisos del proyecto.'
              : response.status === 429
                ? 'OpenAI limitó esta solicitud. Si vuelve a ocurrir, revisa el saldo y los límites de la API.'
                : 'OpenAI no pudo completar la solicitud. Intenta más tarde.';
      console.warn('shift_summary_provider_failed', {
        status: response.status,
        requestId: response.headers.get('x-request-id'),
      });
      return {
        draft: fallback,
        error:
          reason +
          ' Puedes editar el borrador preparado con los conteos de Home Safe.',
      };
    }
    const payload = (await response.json()) as {
      status?: string;
      output?: { type: string; content?: { type: string; text?: string }[] }[];
    };
    const draft = payload.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text ?? '')
      .join('\n')
      .trim();
    if (payload.status !== 'completed' || !draft)
      throw new Error('EMPTY_DRAFT');
    return { draft: draft.slice(0, 2000) };
  } catch {
    console.warn('shift_summary_failed', {
      stage: fallback ? 'provider' : 'counts',
    });
    return fallback
      ? {
          draft: fallback,
          error:
            'La IA no devolvió un borrador utilizable. Puedes editar el borrador preparado con los conteos de Home Safe.',
        }
      : {
          error:
            'No se pudieron consultar los conteos del turno. Intenta de nuevo en un minuto.',
        };
  }
}
