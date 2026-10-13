import "server-only";

import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

/**
 * Compara dois segredos em tempo constante.
 * Os valores passam por SHA-256 para que
 * tamanhos diferentes não vazem pelo tempo.
 */
export function safeCompare(
  received: string,
  expected: string
): boolean {
  if (!received || !expected) {
    return false;
  }

  const receivedHash = createHash("sha256")
    .update(received)
    .digest();

  const expectedHash = createHash("sha256")
    .update(expected)
    .digest();

  return timingSafeEqual(
    receivedHash,
    expectedHash
  );
}
