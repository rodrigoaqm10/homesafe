import type { Metadata } from 'next';
import './globals.css';
import { connection } from 'next/server';
export const metadata: Metadata = {
  title: {
    default: 'HomeSafe Real — El cuidado de tu edificio, elevado.',
    template: '%s · HomeSafe Real',
  },
  description:
    'Administración residencial, operaciones y comunidad en una plataforma diseñada con atención al detalle.',
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <div id="contenido">{children}</div>
      </body>
    </html>
  );
}
