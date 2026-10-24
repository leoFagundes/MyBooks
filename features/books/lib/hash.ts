const encoder = new TextEncoder();

/** FNV-1a de 32 bits sobre os bytes UTF-8: rápido, estável e suficiente para variar cores e alturas. */
export function hashString(text: string) {
  let hash = 0x811c9dc5;
  for (const byte of encoder.encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
