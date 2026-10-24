import crypto from 'crypto';
import { ENTERPRISE_PERSONAS } from './supabase';
import { EnterprisePersona, UserContext } from './types';

// Identity is resolved on the server only. The request body never decides who the
// caller is or what they can see: the persona id comes from an HMAC-signed, httpOnly
// cookie, and role, department and clearance come from the server-side directory.
//
// In this demo, choosing a persona in the UI is the "sign in" step (POST /api/session).
// In production that endpoint would be replaced by SSO; everything downstream stays the same.

export const SESSION_COOKIE = 'omni_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const DEFAULT_PERSONA_ID = 'persona-neil'; // no valid session = least privilege

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return crypto.createHash('sha256').update(`omni-session:${process.env.SUPABASE_SERVICE_ROLE_KEY}`).digest('hex');
  }
  throw new Error('Set SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to sign sessions.');
}

const hmac = (payload: string) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

export function signSession(personaId: string, ttlSeconds = SESSION_TTL_SECONDS): string {
  const payload = `${personaId}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  return `${payload}.${hmac(payload)}`;
}

// Returns the persona id if the cookie is authentic and unexpired, otherwise null.
export function verifySession(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf('.');
  if (i < 0) return null;
  const payload = value.slice(0, i);
  const expected = Buffer.from(hmac(payload));
  const given = Buffer.from(value.slice(i + 1));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const [personaId, expiry] = payload.split('.');
  if (!personaId || !(Number(expiry) > Date.now() / 1000)) return null;
  return personaId;
}

function toUser(p: EnterprisePersona): UserContext {
  return {
    userId: p.id,
    name: p.name,
    email: `${p.name.toLowerCase().replace(' ', '.')}@enterprise.internal`,
    department: p.department,
    role: p.role,
    clearanceLevel: p.clearanceLevel,
    scopes: p.scopes,
  };
}

export function userFromPersonaId(personaId: string): UserContext | null {
  const persona = ENTERPRISE_PERSONAS.find((p) => p.id === personaId);
  return persona ? toUser(persona) : null;
}

export function allPersonaUsers(): UserContext[] {
  return ENTERPRISE_PERSONAS.map(toUser);
}

export function resolveUser(cookieValue: string | undefined): UserContext {
  const personaId = verifySession(cookieValue);
  return (personaId && userFromPersonaId(personaId)) || userFromPersonaId(DEFAULT_PERSONA_ID)!;
}
