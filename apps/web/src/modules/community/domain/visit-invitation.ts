import 'server-only';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { visitCode } from './visit-code';

const recent = new Map<string, number>();

export async function sendVisitInvitation(
  userId: string,
  email: string,
  id: string,
  from: string,
  until: string,
) {
  const pass = process.env.MEMBERSHIP_GMAIL_APP_PASSWORD?.replaceAll(' ', '');
  if (!pass) return false;
  const now = Date.now();
  for (const [key, expires] of recent) if (expires <= now) recent.delete(key);
  if (recent.has(userId) || recent.size >= 1000) return false;
  recent.set(userId, now + 30_000);
  try {
    const inbox = 'zadar0610@gmail.com';
    const mail = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: inbox, pass },
      connectionTimeout: 8000,
      socketTimeout: 12000,
    });
    const format = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const png = await QRCode.toBuffer(visitCode(id), { width: 360 });
    const result = await mail.sendMail({
      from: inbox,
      to: { name: '', address: email },
      subject: 'Autorización de visita · Home Safe',
      text: [
        'Muestra el código QR adjunto en conserjería para que el personal revise tu autorización.',
        'Vigencia (hora de Chile): ' +
          format.format(new Date(from)) +
          ' a ' +
          format.format(new Date(until)),
        'Código para búsqueda manual: ' + id,
      ].join('\n'),
      attachments: [{ filename: 'home-safe-visita.png', content: png }],
    });
    return result.accepted.length > 0;
  } catch {
    return false;
  }
}
