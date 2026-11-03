import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export type Membership = {
  id: string;
  organization_id: string;
  community_id: string;
  profile_id: string;
  role: 'residente' | 'conserje' | 'administrador';
  unit_id: string | null;
  status: string;
};
export async function requireIdentity() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect('/acceso');
  return { client, user: data.user };
}
export async function requireMembership(id: string) {
  const { client, user } = await requireIdentity();
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/portal');
  const { data, error } = await client
    .from('community_memberships')
    .select('id,organization_id,community_id,profile_id,role,unit_id,status')
    .eq('id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (
    error ||
    !data ||
    !['residente', 'conserje', 'administrador'].includes(data.role)
  )
    redirect('/portal');
  const member = data as Membership;
  if (member.role === 'administrador') {
    const { data: claims, error: claimsError } = await client.auth.getClaims();
    if (claimsError || claims?.claims.aal !== 'aal2') redirect('/seguridad');
  }
  return { client, user, member };
}
