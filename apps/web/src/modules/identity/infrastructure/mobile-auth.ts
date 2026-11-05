import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Membership } from './session';
export class MobileAccessError extends Error {
  constructor(public status: number) {
    super('Access denied');
  }
}
export async function mobileIdentity(request: Request, membershipId: unknown) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length > 16384)
    throw new MobileAccessError(401);
  if (
    typeof membershipId !== 'string' ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(membershipId)
  )
    throw new MobileAccessError(400);
  const token = authorization.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new MobileAccessError(503);
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const identity = await client.auth.getUser(token);
  if (identity.error || !identity.data.user) throw new MobileAccessError(401);
  const result = await client
    .from('community_memberships')
    .select('id,organization_id,community_id,profile_id,role,unit_id,status')
    .eq('id', membershipId)
    .eq('profile_id', identity.data.user.id)
    .eq('status', 'active')
    .single();
  if (
    result.error ||
    !result.data ||
    !['residente', 'conserje', 'administrador'].includes(result.data.role)
  )
    throw new MobileAccessError(403);
  const member = result.data as Membership;
  if (member.role === 'administrador') {
    const claims = await client.auth.getClaims(token);
    if (claims.error || claims.data?.claims.aal !== 'aal2')
      throw new MobileAccessError(403);
  }
  return { client, member, user: identity.data.user };
}
