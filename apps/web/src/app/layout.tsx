import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/components/theme-toggle';
export const metadata: Metadata = {
  title: {
    default: 'Home Safe — El cuidado de tu edificio, elevado.',
    template: '%s · Home Safe',
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
  const theme =
    (await cookies()).get('home-safe-theme')?.value === 'dark'
      ? 'dark'
      : 'light';
  return (
    <html lang="es" data-theme={theme}>
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <ThemeProvider initial={theme}>
          <div id="contenido">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
