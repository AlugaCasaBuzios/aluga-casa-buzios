import "server-only";

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const HASH_PREFIX = "scrypt";
const HASH_LENGTH = 64;
const ACCESS_DURATION_SECONDS = 24 * 60 * 60;

function getSigningSecret(): string {
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error("A variável SUPABASE_SECRET_KEY não foi configurada.");
  }

  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function hashVirtualTourPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password.normalize("NFKC"), salt, HASH_LENGTH);

  return [
    HASH_PREFIX,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export function verifyVirtualTourPassword(
  password: string,
  storedHash: string | null
): boolean {
  if (!storedHash) {
    return false;
  }

  const [prefix, saltValue, hashValue] = storedHash.split("$");

  if (prefix !== HASH_PREFIX || !saltValue || !hashValue) {
    return false;
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expectedHash = Buffer.from(hashValue, "base64url");
    const suppliedHash = scryptSync(
      password.normalize("NFKC"),
      salt,
      expectedHash.length
    );

    return (
      expectedHash.length === suppliedHash.length &&
      timingSafeEqual(expectedHash, suppliedHash)
    );
  } catch {
    return false;
  }
}

export function getVirtualTourAccessCookieName(tourId: string): string {
  return `vt_access_${tourId.replace(/-/g, "")}`;
}

export function createVirtualTourAccessCookie(
  tourId: string,
  accessVersion: string,
  accessExpiresAt: string | null
): { value: string; expires: Date } {
  const now = Date.now();
  const defaultExpiration = now + ACCESS_DURATION_SECONDS * 1000;
  const configuredExpiration = accessExpiresAt
    ? new Date(accessExpiresAt).getTime()
    : Number.POSITIVE_INFINITY;
  const expirationTime = Math.min(defaultExpiration, configuredExpiration);
  const expires = new Date(expirationTime);
  const payload = `${tourId}.${accessVersion}.${Math.floor(
    expirationTime / 1000
  )}`;
  const signature = signPayload(payload);

  return {
    value: `${payload}.${signature}`,
    expires,
  };
}

export function isValidVirtualTourAccessCookie(
  value: string | undefined,
  tourId: string,
  accessVersion: string
): boolean {
  if (!value) {
    return false;
  }

  const parts = value.split(".");

  if (parts.length !== 4) {
    return false;
  }

  const [cookieTourId, cookieVersion, expiresValue, suppliedSignature] = parts;
  const expiresAt = Number(expiresValue);

  if (
    cookieTourId !== tourId ||
    cookieVersion !== accessVersion ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const payload = `${cookieTourId}.${cookieVersion}.${expiresValue}`;
  const expectedSignature = signPayload(payload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
