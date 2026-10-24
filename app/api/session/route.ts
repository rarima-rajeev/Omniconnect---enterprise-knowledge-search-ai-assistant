import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, userFromPersonaId } from '@/lib/session';

// Demo sign-in: choosing a persona in the UI issues a signed session cookie.
// In production this would be the SSO callback; the copilot route only ever reads the cookie.
export async function POST(req: NextRequest) {
  const { personaId } = await req.json().catch(() => ({}));
  const user = typeof personaId === 'string' ? userFromPersonaId(personaId) : null;
  if (!user) return NextResponse.json({ error: 'Unknown persona' }, { status: 400 });

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, signSession(user.userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ user: resolveUser(req.cookies.get(SESSION_COOKIE)?.value) });
}
