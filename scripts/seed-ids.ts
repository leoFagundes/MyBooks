import { createHash } from "node:crypto";

export type SeedKind = "user" | "book" | "collection" | "quote";

/**
 * UUID estável a partir do slug (formato v5, com SHA-256): o seed pode rodar
 * de novo sem duplicar nada, e testes e demos acham o livro pelo slug.
 */
export function seedId(kind: SeedKind, slug: string): string {
  const hex = createHash("sha256")
    .update(`mybooks:${kind}:${slug}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join("-");
}
