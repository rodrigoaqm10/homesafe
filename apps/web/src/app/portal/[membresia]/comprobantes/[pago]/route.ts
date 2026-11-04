import { financeDownload } from '@/modules/finance/infrastructure/pdf';
import { residentReceipt } from '@/modules/finance/infrastructure/receipt';
import { requireMembership } from '@/modules/identity/infrastructure/session';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ membresia: string; pago: string }> },
) {
  const { membresia, pago } = await params;
  const { client, member } = await requireMembership(membresia);
  const pdf = await residentReceipt(client, member, pago);
  if (!pdf)
    return new Response(null, {
      status: 404,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  return financeDownload(pdf, 'home-safe-comprobante.pdf', 'application/pdf');
}
