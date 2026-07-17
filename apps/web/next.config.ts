import type { NextConfig } from 'next';

/**
 * Security headers applied to every response (spec 07 §5).
 * The CSP script nonce is added per-request in middleware; this static set
 * covers everything that does not need a nonce.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(), payment=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Native module and its consumer stay out of the bundle so SQLite and the
  // committed migrations folder resolve from the real filesystem.
  serverExternalPackages: ['better-sqlite3', '@fanaxo/db'],
  headers() {
    return Promise.resolve([{ source: '/(.*)', headers: securityHeaders }]);
  },
};

export default nextConfig;
