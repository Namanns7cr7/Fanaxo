/**
 * POST /api/auth/logout — invalidates the server-side session, then clears
 * the cookie (spec 07 §3: logout must not be client-state-only).
 * Responds with a redirect so plain <form> posts land back on the landing page.
 */

import { NextResponse } from 'next/server';

import { destroySession } from '@/server/auth/session';

export async function POST(request: Request): Promise<Response> {
  await destroySession();
  return NextResponse.redirect(new URL('/', request.url), 303);
}
