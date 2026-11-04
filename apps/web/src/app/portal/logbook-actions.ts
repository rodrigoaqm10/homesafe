'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export async function addShiftNote(form: FormData) {
  const { member, client } = await requireMembership(
    String(form.get('membership_id') ?? ''),
  );
  if (member.role !== 'conserje') redirect('/portal');
  const body = String(form.get('body') ?? '').trim();
  const saved =
    body.length >= 3 &&
    body.length <= 2000 &&
    !(
      await client.from('shift_notes').insert({
        organization_id: member.organization_id,
        community_id: member.community_id,
        body,
      })
    ).error;
  revalidatePath('/portal/' + member.id);
  redirect(
    '/portal/' +
      member.id +
      '?seccion=bitacora&estado=' +
      (saved ? 'guardado' : 'no_disponible'),
  );
}
