import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Fanaxo AI — Stadium Operating System',
    template: '%s · Fanaxo AI',
  },
  description:
    'GenAI stadium operations and matchday experience platform connecting fans, volunteers, and operators through shared live state.',
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {/* Keyboard users can bypass navigation on every page (WCAG 2.4.1). */}
        <a
          href="#main"
          className="focus:bg-brand-blue sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
