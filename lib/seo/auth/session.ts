// Encrypted session and OAuth-state cookies (JWE, dir + A256GCM via jose).
// Pure module: the secret is passed in, so it is unit-testable.

import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";

export const SESSION_COOKIE = "pressd_seo_session";
export const OAUTH_COOKIE = "pressd_seo_oauth";
export const SESSION_MAX_AGE_S = 8 * 60 * 60; // absolute lifetime; no silent extension
export const OAUTH_MAX_AGE_S = 10 * 60;

function keyFrom(secret: string, purpose: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(`${purpose}:${secret}`).digest());
}

export interface Session {
  email: string;
  name: string | null;
  issuedAt: number; // seconds
}

export interface OAuthState {
  flow: "login" | "search_console";
  state: string;
  verifier: string;
  nonce: string;
  email?: string; // for search_console: the signed-in admin starting it
}

async function seal(payload: Record<string, unknown>, secret: string, purpose: string, maxAge: number): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .setAudience(purpose)
    .encrypt(keyFrom(secret, purpose));
}

async function open<T>(token: string | undefined | null, secret: string, purpose: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, keyFrom(secret, purpose), { audience: purpose });
    return payload as T;
  } catch {
    return null; // expired, tampered or wrong key → treated as signed out
  }
}

export function sealSession(s: Omit<Session, "issuedAt">, secret: string): Promise<string> {
  return seal({ email: s.email, name: s.name }, secret, "session", SESSION_MAX_AGE_S);
}

export async function openSession(token: string | undefined | null, secret: string): Promise<Session | null> {
  const p = await open<{ email?: unknown; name?: unknown; iat?: number }>(token, secret, "session");
  if (!p || typeof p.email !== "string") return null;
  return { email: p.email, name: typeof p.name === "string" ? p.name : null, issuedAt: p.iat ?? 0 };
}

export function sealOAuthState(s: OAuthState, secret: string): Promise<string> {
  return seal({ ...s }, secret, "oauth", OAUTH_MAX_AGE_S);
}

export async function openOAuthState(token: string | undefined | null, secret: string): Promise<OAuthState | null> {
  const p = await open<Partial<OAuthState>>(token, secret, "oauth");
  if (!p || (p.flow !== "login" && p.flow !== "search_console") || !p.state || !p.verifier || !p.nonce) return null;
  return { flow: p.flow, state: p.state, verifier: p.verifier, nonce: p.nonce, email: p.email };
}
