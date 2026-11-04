'use server';
import { redirect } from 'next/navigation';
import nodemailer from 'nodemailer';
import { residentReceipt } from '@/modules/finance/infrastructure/receipt';
import { requireMembership } from '@/modules/identity/infrastructure/session';

const sends = new Map<string, number>();

export async function emailReceipt(form: FormData) {
  const { client, member, user } = await requireMembership(
    String(form.get('membership_id') ?? ''),
  );
  if (member.role !== 'residente') redirect('/portal');
  let sent = false;
  const now = Date.now();
  for (const [key, until] of sends) if (until <= now) sends.delete(key);
  const pass = process.env.MEMBERSHIP_GMAIL_APP_PASSWORD?.replaceAll(' ', '');
  if (
    user.email_confirmed_at &&
    user.email &&
    pass &&
    !sends.has(user.id) &&
    sends.size < 1000
  ) {
    sends.set(user.id, now + 60_000);
    try {
      const pdf = await residentReceipt(
        client,
        member,
        String(form.get('payment_id') ?? ''),
      );
      if (pdf) {
        const inbox = 'zadar0610@gmail.com';
        const mail = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: inbox, pass },
          connectionTimeout: 8000,
          socketTimeout: 12000,
        });
        const result = await mail.sendMail({
          from: inbox,
          to: user.email,
          subject: 'Comprobante de abono Home Safe',
          text: 'Adjuntamos el comprobante que solicitaste desde tu cuenta de Home Safe.',
          attachments: [
            { filename: 'home-safe-comprobante.pdf', content: pdf },
          ],
        });
        sent = result.accepted.length > 0;
      }
    } catch {}
  }
  redirect(
    '/portal/' +
      member.id +
      '?seccion=cuenta&estado=' +
      (sent ? 'comprobante_enviado' : 'comprobante_error'),
  );
}
