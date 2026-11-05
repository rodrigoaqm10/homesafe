import { financeExport } from '@/modules/finance/infrastructure/export-report';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ membresia: string }> },
) {
  const { client, member } = await requireMembership((await params).membresia);
  if (member.role !== 'administrador')
    return new Response(null, { status: 403 });
  const format = new URL(request.url).searchParams.get('formato');
  if (format !== 'pdf' && format !== 'xlsx')
    return new Response(null, { status: 400 });
  return financeExport(client, member, format);
}
