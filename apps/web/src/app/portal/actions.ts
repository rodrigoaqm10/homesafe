'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { santiagoToIso } from '@/modules/community/domain/time';
import { sendVisitInvitation } from '@/modules/community/domain/visit-invitation';
import { portalSection } from '@/modules/identity/domain/portal-navigation';
import { requireMembership } from '@/modules/identity/infrastructure/session';

function uuid(value: unknown) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
export async function operate(form: FormData) {
  const membershipId = String(form.get('membership_id') ?? '');
  const { client, member, user } = await requireMembership(membershipId);
  const kind = String(form.get('kind'));
  const unit =
    member.role === 'residente' ? member.unit_id : String(form.get('unit_id'));
  const scope = {
    organization_id: member.organization_id,
    community_id: member.community_id,
  };
  let successful = false;
  let visitMailFailed = false;
  try {
    if (['create_visit', 'create_incident', 'receive_package'].includes(kind)) {
      if (!uuid(unit)) throw new Error('UNIT_REQUIRED');
      if (member.role !== 'residente') {
        const { data: allowed } = await client
          .from('units')
          .select('id')
          .eq('id', unit)
          .eq('community_id', member.community_id)
          .eq('organization_id', member.organization_id)
          .maybeSingle();
        if (!allowed) throw new Error('UNIT_DENIED');
      }
      const text = String(form.get('text') ?? '').trim();
      if (kind === 'create_visit') {
        if (text.length < 3 || text.length > 80)
          throw new Error('INVALID_TEXT');
        const valid_from = santiagoToIso(String(form.get('from')));
        const valid_until = santiagoToIso(String(form.get('until')));
        if (
          Date.parse(valid_until) <= Date.parse(valid_from) ||
          Date.parse(valid_until) <= Date.now() ||
          Date.parse(valid_until) - Date.parse(valid_from) > 7 * 86400000
        )
          throw new Error('INVALID_DATES');
        const plate = String(form.get('vehicle_plate') ?? '')
          .trim()
          .toUpperCase()
          .replace(/[\s-]/g, '');
        const email = String(form.get('visitor_email') ?? '').trim();
        if (plate && !/^[A-Z0-9]{5,8}$/.test(plate))
          throw new Error('INVALID_PLATE');
        if (
          email &&
          (email.length > 254 ||
            !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email))
        )
          throw new Error('INVALID_EMAIL');
        const { data: visit, error } = await client
          .from('visits')
          .insert({
            ...scope,
            unit_id: unit,
            visitor_name: text,
            valid_from,
            valid_until,
            ...(plate ? { vehicle_plate: plate } : {}),
          })
          .select('id')
          .single();
        successful = !error && Boolean(visit);
        if (successful && visit && email) {
          visitMailFailed = !(await sendVisitInvitation(
            user.id,
            email,
            visit.id,
            valid_from,
            valid_until,
          ));
        }
      } else if (kind === 'create_incident') {
        if (text.length < 5 || text.length > 160)
          throw new Error('INVALID_TEXT');
        const { error } = await client
          .from('incidents')
          .insert({ ...scope, unit_id: unit, title: text });
        successful = !error;
      } else {
        if (member.role === 'residente' || text.length < 2 || text.length > 100)
          throw new Error('NOT_ALLOWED');
        const { error } = await client
          .from('packages')
          .insert({ ...scope, unit_id: unit, carrier: text });
        successful = !error;
      }
    } else if (kind === 'publish') {
      if (member.role !== 'administrador') throw new Error('NOT_ALLOWED');
      const title = String(form.get('text') ?? '').trim();
      const body = String(form.get('body') ?? '').trim();
      if (
        title.length < 5 ||
        title.length > 160 ||
        body.length < 5 ||
        body.length > 10000
      )
        throw new Error('INVALID_TEXT');
      const { error } = await client
        .from('announcements')
        .insert({ ...scope, title, body });
      successful = !error;
    } else {
      const id = String(form.get('record_id'));
      if (!uuid(id)) throw new Error('INVALID_ID');
      const table =
        kind === 'visit_state'
          ? 'visits'
          : kind === 'deliver'
            ? 'packages'
            : kind === 'incident_state'
              ? 'incidents'
              : null;
      if (!table) throw new Error('INVALID_ACTION');
      const { data: record } = await client
        .from(table)
        .select('id')
        .eq('id', id)
        .eq('organization_id', member.organization_id)
        .eq('community_id', member.community_id)
        .maybeSingle();
      if (!record) throw new Error('NOT_ALLOWED');
      if (kind === 'visit_state') {
        const next = String(form.get('next_status'));
        if (!['arrived', 'departed', 'cancelled'].includes(next))
          throw new Error('INVALID_STATE');
        if (member.role === 'residente' && next !== 'cancelled')
          throw new Error('NOT_ALLOWED');
        const { error } = await client.rpc('transition_visit', {
          visit_id: id,
          next_status: next,
        });
        successful = !error;
      } else if (kind === 'deliver') {
        if (member.role === 'residente') throw new Error('NOT_ALLOWED');
        const { error } = await client.rpc('deliver_package', {
          package_id: id,
        });
        successful = !error;
      } else {
        if (member.role === 'residente') throw new Error('NOT_ALLOWED');
        const next = String(form.get('next_status'));
        if (!['in_progress', 'resolved'].includes(next))
          throw new Error('INVALID_STATE');
        const { error } = await client.rpc('transition_incident', {
          incident_id: id,
          next_status: next,
        });
        successful = !error;
      }
    }
  } catch {
    successful = false;
  }
  revalidatePath(`/portal/${member.id}`);
  const section = portalSection(
    member.role,
    String(form.get('return_section') ?? ''),
  );
  const location =
    member.role === 'administrador'
      ? 'seccion=operaciones&operacion=' + section
      : 'seccion=' + section;
  redirect(
    '/portal/' +
      member.id +
      '?' +
      location +
      '&estado=' +
      (successful
        ? visitMailFailed
          ? 'visita_sin_correo'
          : 'guardado'
        : 'no_disponible'),
  );
}
