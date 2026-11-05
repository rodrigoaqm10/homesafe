'use server';
import { buildShiftSummary } from '@/modules/community/infrastructure/shift-summary';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export async function generateShiftSummary(
  _state: { draft?: string; error?: string },
  form: FormData,
): Promise<{ draft?: string; error?: string }> {
  const { client, member } = await requireMembership(
    String(form.get('membership_id') ?? ''),
  );
  return buildShiftSummary(client, member);
}
