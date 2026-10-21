// AES-256-GCM encryption for OAuth tokens at rest. Pure module (node:crypto).
// Key: SEO_TOKEN_ENCRYPTION_KEY = 32 random bytes, base64 encoded
//   (generate with: openssl rand -base64 32)

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

export function parseKey(b64: string | undefined | null): Buffer {
  if (!b64) throw new Error("SEO_TOKEN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(b64.trim(), "base64");
  if (key.length !== 32) throw new Error("SEO_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return key;
}

/** `aad` binds the ciphertext to its purpose (e.g. "gsc:refresh"), so values cannot be swapped between fields. */
export function encryptSecret(plaintext: string, key: Buffer, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, key: Buffer, aad: string): string {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== VERSION || !iv || !tag || ct === undefined) throw new Error("Unrecognised encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
