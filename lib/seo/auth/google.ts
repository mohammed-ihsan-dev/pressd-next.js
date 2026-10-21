// Google OAuth 2.0 / OpenID Connect (authorization-code flow with PKCE),
// used both for admin sign-in and for the read-only Search Console grant.
// All calls are server-side; client secret and tokens never reach the browser.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
export const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export const LOGIN_SCOPES = ["openid", "email", "profile"];
/** Read-only Search Console access; no write scope is ever requested. */
export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function buildAuthUrl(
  client: OAuthClient,
  opts: { flow: "login" | "search_console"; state: string; verifier: string; nonce: string; loginHint?: string },
): string {
  const u = new URL(AUTH_ENDPOINT);
  const scopes = opts.flow === "login" ? LOGIN_SCOPES : ["openid", "email", SEARCH_CONSOLE_SCOPE];
  u.searchParams.set("client_id", client.clientId);
  u.searchParams.set("redirect_uri", client.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", scopes.join(" "));
  u.searchParams.set("state", opts.state);
  u.searchParams.set("nonce", opts.nonce);
  u.searchParams.set("code_challenge", pkceChallenge(opts.verifier));
  u.searchParams.set("code_challenge_method", "S256");
  if (opts.flow === "search_console") {
    // A refresh token is needed to keep reporting working after the hour-long access token expires.
    u.searchParams.set("access_type", "offline");
    u.searchParams.set("prompt", "consent");
  } else {
    u.searchParams.set("prompt", "select_account");
  }
  if (opts.loginHint) u.searchParams.set("login_hint", opts.loginHint);
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  token_type: string;
}

export class GoogleAuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
  }
}

type Fetch = typeof fetch;

async function tokenRequest(body: Record<string, string>, f: Fetch): Promise<TokenResponse> {
  const res = await f(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // Google's error codes (e.g. invalid_grant) are safe to show; descriptions never include secrets.
    throw new GoogleAuthError(String(json.error ?? `http_${res.status}`), String(json.error_description ?? "Google rejected the token request"));
  }
  return json as unknown as TokenResponse;
}

export function exchangeCode(client: OAuthClient, code: string, verifier: string, f: Fetch = fetch): Promise<TokenResponse> {
  return tokenRequest(
    { code, client_id: client.clientId, client_secret: client.clientSecret, redirect_uri: client.redirectUri, grant_type: "authorization_code", code_verifier: verifier },
    f,
  );
}

export function refreshAccessToken(client: OAuthClient, refreshToken: string, f: Fetch = fetch): Promise<TokenResponse> {
  return tokenRequest({ refresh_token: refreshToken, client_id: client.clientId, client_secret: client.clientSecret, grant_type: "refresh_token" }, f);
}

export async function revokeToken(token: string, f: Fetch = fetch): Promise<boolean> {
  const res = await f(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    signal: AbortSignal.timeout(15000),
  });
  return res.ok;
}

let jwks: JWTVerifyGetKey | null = null;

export interface IdentityClaims {
  email: string;
  name: string | null;
  sub: string;
}

/** Verifies Google's ID token signature, issuer, audience, expiry and nonce. */
export async function verifyIdToken(idToken: string, clientId: string, nonce: string, keySet?: JWTVerifyGetKey): Promise<IdentityClaims> {
  jwks ??= createRemoteJWKSet(new URL(JWKS_URL));
  const { payload } = await jwtVerify(idToken, keySet ?? jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  if (typeof payload.nonce !== "string" || !safeEqual(payload.nonce, nonce)) throw new GoogleAuthError("bad_nonce", "ID token nonce mismatch");
  if (payload.email_verified !== true || typeof payload.email !== "string") throw new GoogleAuthError("unverified_email", "Google account email is not verified");
  return { email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name : null, sub: String(payload.sub) };
}
