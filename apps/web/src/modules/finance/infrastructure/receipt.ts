import 'server-only';
import type { createClient } from '@/lib/supabase/server';
import type { Membership } from '@/modules/identity/infrastructure/session';
import { money } from '../domain/money';
import { financePdf } from './pdf';

export async function residentReceipt(
  client: Awaited<ReturnType<typeof createClient>>,
  member: Membership,
  id: string,
) {
  if (
    member.role !== 'residente' ||
    !member.unit_id ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const scope = <Columns extends string>(table: string, columns: Columns) =>
    client
      .from(table)
      .select(columns)
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id);
  const [payment, reversal, community, unit] = await Promise.all([
    scope(
      'finance_payment_history',
      'id,charge_description,amount_clp,created_at,reference',
    )
      .eq('unit_id', member.unit_id)
      .eq('kind', 'receipt')
      .eq('id', id)
      .maybeSingle(),
    scope('finance_payment_history', 'id')
      .eq('unit_id', member.unit_id)
      .eq('reversal_of', id)
      .maybeSingle(),
    client
      .from('communities')
      .select('name')
      .eq('id', member.community_id)
      .eq('organization_id', member.organization_id)
      .single(),
    scope('units', 'label').eq('id', member.unit_id).single(),
  ]);
  if (
    payment.error ||
    reversal.error ||
    community.error ||
    unit.error ||
    !payment.data
  )
    return null;
  const p = payment.data;
  return financePdf(
    'Comprobante de abono',
    community.data.name + ' · Unidad ' + unit.data.label,
    [
      {
        title: reversal.data ? 'Abono revertido' : 'Abono registrado',
        rows: [
          'Concepto: ' + p.charge_description,
          'Monto: ' + money(p.amount_clp),
          'Fecha: ' +
            new Intl.DateTimeFormat('es-CL', {
              timeZone: 'America/Santiago',
              dateStyle: 'long',
              timeStyle: 'short',
            }).format(new Date(p.created_at)),
          'Referencia: ' + p.reference,
          'Identificador: ' + p.id,
          'Comprobante interno de Home Safe.',
        ],
      },
    ],
  );
}
