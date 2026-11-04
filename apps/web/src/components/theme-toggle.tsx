'use client';
import { createContext, type ReactNode, useContext, useState } from 'react';

const ThemeContext = createContext<{
  dark: boolean;
  toggle: () => void;
} | null>(null);
export function ThemeProvider({
  initial,
  children,
}: {
  initial: 'light' | 'dark';
  children: ReactNode;
}) {
  const [dark, setDark] = useState(initial === 'dark');
  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.cookie =
      'home-safe-theme=' +
      next +
      '; Path=/; Max-Age=31536000; SameSite=Lax' +
      (location.protocol === 'https:' ? '; Secure' : '');
    setDark(!dark);
  }
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeToggle() {
  const theme = useContext(ThemeContext);
  if (!theme) return null;
  const { dark, toggle } = theme;
  const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19" />
          </>
        ) : (
          <path d="M20.6 14A8.8 8.8 0 0 1 10 3.4 8.8 8.8 0 1 0 20.6 14Z" />
        )}
      </svg>
    </button>
  );
}
