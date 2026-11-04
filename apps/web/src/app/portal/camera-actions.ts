'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hasCommunityPro } from '@/modules/identity/infrastructure/community-plan';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export async function cameraAction(form: FormData) {
  const { client, member } = await requireMembership(
    String(form.get('membership_id') ?? ''),
  );
  if (member.role === 'residente' || !(await hasCommunityPro(client, member)))
    redirect('/portal/' + member.id);
  const scope = {
    organization_id: member.organization_id,
    community_id: member.community_id,
  };
  const operation = form.get('operation');
  let saved = false;
  if (operation === 'register' && member.role === 'administrador') {
    const label = String(form.get('label') ?? '').trim();
    const location = String(form.get('location') ?? '').trim();
    if (
      label.length >= 2 &&
      label.length <= 80 &&
      location.length >= 2 &&
      location.length <= 120
    ) {
      const { error } = await client
        .from('security_cameras')
        .insert({ ...scope, label, location });
      saved = !error;
    }
  } else if (operation === 'observe') {
    const camera_id = String(form.get('camera_id') ?? '');
    const state = String(form.get('state') ?? '');
    const note = String(form.get('note') ?? '').trim();
    if (
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(camera_id) &&
      ['operativa', 'sin_imagen', 'en_revision'].includes(state) &&
      note.length <= 400
    ) {
      const { error } = await client
        .from('security_camera_events')
        .insert({ ...scope, camera_id, state, note });
      saved = !error;
    }
  }
  revalidatePath('/portal/' + member.id);
  redirect(
    '/portal/' +
      member.id +
      '?seccion=camaras&estado=' +
      (saved ? 'guardado' : 'no_disponible'),
  );
}
