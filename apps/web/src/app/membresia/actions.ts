'use server';
import { headers } from 'next/headers';
import nodemailer from 'nodemailer';
import { membershipPlans } from './plans';

const inbox = 'zadar0610@gmail.com';
const recent = new Map<string, number>();
const cooldown = 60_000;

export async function sendMembershipInquiry(
  _previous: string,
  form: FormData,
): Promise<string> {
  const name = String(form.get('name') ?? '').trim();
  const community = String(form.get('community') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();
  const plan = membershipPlans.find(({ id }) => id === form.get('plan'));
  if (
    form.get('website') ||
    !plan ||
    name.length < 2 ||
    name.length > 100 ||
    community.length < 2 ||
    community.length > 120 ||
    email.length > 254 ||
    !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email) ||
    message.length > 1200
  )
    return 'invalid';

  const pass = process.env.MEMBERSHIP_GMAIL_APP_PASSWORD?.replaceAll(' ', '');
  if (!pass) return 'unavailable';

  const ip =
    (await headers()).get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    'local';
  const now = Date.now();
  for (const [key, time] of recent)
    if (now - time >= cooldown) recent.delete(key);
  if (recent.has(ip) || recent.size >= 250) return 'rate';
  recent.set(ip, now);

  const smtp = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: inbox, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  try {
    const result = await smtp.sendMail({
      from: inbox,
      to: inbox,
      replyTo: { name, address: email },
      subject: 'Consulta de membresía Home Safe',
      text: [
        'Plan: ' + plan.tier + ' · ' + plan.months + ' meses',
        'Nombre: ' + name,
        'Comunidad: ' + community,
        'Correo: ' + email,
        '',
        message,
      ].join('\n'),
    });
    return result.accepted.length > 0 ? 'sent' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
