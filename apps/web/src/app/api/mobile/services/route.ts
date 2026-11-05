import nodemailer from 'nodemailer';
import {
  mobileIdentity,
  MobileAccessError,
} from '@/modules/identity/infrastructure/mobile-auth';
import { sendVisitInvitation } from '@/modules/community/domain/visit-invitation';
import { buildShiftSummary } from '@/modules/community/infrastructure/shift-summary';
import { residentReceipt } from '@/modules/finance/infrastructure/receipt';
import { financeExport } from '@/modules/finance/infrastructure/export-report';
import { financeDownload } from '@/modules/finance/infrastructure/pdf';
export const runtime = 'nodejs';
const sends = new Map<string, number>();
const error = (message: string, status: number) =>
  Response.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
export async function POST(request: Request) {
  try {
    if (!request.headers.get('authorization')?.startsWith('Bearer '))
      return error('Ingresa nuevamente para continuar.', 401);
    if (Number(request.headers.get('content-length')) > 4096)
      return error('Solicitud demasiado grande.', 413);
    const reader = request.body?.getReader();
    if (!reader) return error('Solicitud inválida.', 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        return error('Solicitud demasiado grande.', 413);
      }
      chunks.push(value);
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || Array.isArray(body) || typeof body !== 'object')
        return error('Solicitud inválida.', 400);
    } catch {
      return error('Solicitud inválida.', 400);
    }
    const { client, member, user } = await mobileIdentity(
      request,
      body.membership_id,
    );
    if (body.action === 'export') {
      if (member.role !== 'administrador')
        return error('Acceso exclusivo de administración.', 403);
      if (body.format !== 'pdf' && body.format !== 'xlsx')
        return error('Formato inválido.', 400);
      return financeExport(client, member, body.format);
    }
    if (body.action === 'summary') {
      if (member.role === 'residente')
        return error('Acceso exclusivo del personal.', 403);
      return Response.json(await buildShiftSummary(client, member));
    }
    if (body.action === 'visit_email') {
      const email = String(body.email ?? '').trim(),
        id = String(body.visit_id ?? '');
      if (
        email.length > 254 ||
        !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email) ||
        !/^[0-9a-f-]{36}$/i.test(id)
      )
        return error('Correo o visita inválidos.', 400);
      const visit = await client
        .from('visits')
        .select('id,created_by,valid_from,valid_until,status,created_at')
        .eq('id', id)
        .eq('organization_id', member.organization_id)
        .eq('community_id', member.community_id)
        .eq('created_by', user.id)
        .single();
      if (
        visit.error ||
        !visit.data ||
        visit.data.status !== 'authorized' ||
        Date.parse(visit.data.valid_until) < Date.now() ||
        Date.parse(visit.data.created_at) < Date.now() - 3600000
      )
        return error('Esta autorización no está disponible para envío.', 403);
      const sent = await sendVisitInvitation(
        user.id,
        email,
        id,
        visit.data.valid_from,
        visit.data.valid_until,
      );
      return Response.json({
        sent,
        warning: sent
          ? ''
          : 'La visita quedó guardada, pero no se pudo enviar el correo. Puedes compartir el QR.',
      });
    }
    if (body.action === 'receipt' || body.action === 'receipt_email') {
      if (member.role !== 'residente')
        return error('Acceso exclusivo del residente.', 403);
      const pdf = await residentReceipt(
        client,
        member,
        String(body.payment_id ?? ''),
      );
      if (!pdf) return error('Comprobante no disponible.', 404);
      if (body.action === 'receipt')
        return financeDownload(
          pdf,
          'home-safe-comprobante.pdf',
          'application/pdf',
        );
      const now = Date.now();
      for (const [id, until] of sends) if (until <= now) sends.delete(id);
      if (sends.has(user.id) || sends.size >= 1000)
        return error('Espera un minuto antes de reenviar.', 429);
      const pass = process.env.MEMBERSHIP_GMAIL_APP_PASSWORD?.replaceAll(
        ' ',
        '',
      );
      if (!pass || !user.email || !user.email_confirmed_at)
        return error(
          'El envío requiere un correo confirmado y el servicio de correo activo.',
          503,
        );
      sends.set(user.id, now + 60000);
      const mail = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: 'zadar0610@gmail.com', pass },
        connectionTimeout: 8000,
        socketTimeout: 12000,
      });
      const sent = await mail.sendMail({
        from: 'zadar0610@gmail.com',
        to: user.email,
        subject: 'Comprobante de abono · Home Safe',
        text: 'Adjuntamos el comprobante interno que solicitaste desde tu cuenta.',
        attachments: [{ filename: 'home-safe-comprobante.pdf', content: pdf }],
      });
      if (!sent.accepted.length)
        return error('No se pudo entregar el correo.', 502);
      return Response.json({ sent: true });
    }
    return error('Acción no disponible.', 400);
  } catch (e) {
    if (e instanceof MobileAccessError)
      return error(
        e.status === 401
          ? 'Tu sesión venció. Ingresa nuevamente.'
          : 'Acceso no disponible. Verifica tu perfil y la autenticación adicional.',
        e.status,
      );
    return error('No se pudo completar la solicitud. Intenta nuevamente.', 503);
  }
}
