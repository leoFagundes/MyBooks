// O banco guarda o avatar como caminho no bucket (sem domínio) ou como a URL
// do Google; aqui ele vira algo que a <img> carrega
const OWN_BUCKET = /^avatars\/[0-9a-f-]{36}\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const GOOGLE = /^https:\/\/lh3\.googleusercontent\.com\/\S+$/;

export function avatarSrc(
  value: string | null | undefined,
  supabaseUrl: string,
): string | null {
  if (!value) return null;
  if (GOOGLE.test(value)) return value;
  if (!OWN_BUCKET.test(value)) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${value}`;
}
