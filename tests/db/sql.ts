import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// O projeto é o da URL do app: trocar de banco é trocar só o .env.local
function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL no .env.local");
  return new URL(url).hostname.split(".")[0];
}

/** Roda SQL no banco do projeto pela API de gestão do Supabase. */
export async function runSql(query: string): Promise<unknown[]> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Falta SUPABASE_ACCESS_TOKEN no .env.local (Account → Access Tokens)",
    );
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef()}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : JSON.stringify(body);
    throw new Error(`SQL falhou (${response.status}): ${message}`);
  }
  return body as unknown[];
}

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** Envolve os comandos numa transação desfeita no fim: o teste não deixa dados. */
export function sqlTransaction(...statements: string[]): string {
  return ["begin;", ...statements, "rollback;"].join("\n");
}

/** Falha a transação com a mensagem quando a condição SQL é falsa. */
export function check(condition: string, message: string): string {
  return `do $$ begin assert (${condition}), ${literal(message)}; end $$;`;
}

/** Falha quando o comando passa: para provar que a RLS ou um check barram. */
export function rejects(statement: string, message: string): string {
  return `do $$ begin
  begin
    ${statement}
  exception when others then
    return;
  end;
  raise exception ${literal(`devia ter sido barrado: ${message}`)};
end $$;`;
}

/** Daqui em diante, os comandos rodam como a pessoa logada (RLS vale). */
export function asUser(id: string): string {
  const claims = JSON.stringify({ sub: id, role: "authenticated" });
  return `set local role authenticated; select set_config('request.jwt.claims', ${literal(claims)}, true);`;
}

/** Daqui em diante, como visitante sem login. */
export function asAnon(): string {
  return `set local role anon; select set_config('request.jwt.claims', '{"role":"anon"}', true);`;
}

/** Volta ao papel do dono do banco, sem RLS (para preparar dados). */
export function asAdmin(): string {
  return "reset role;";
}

/** Cria a conta como o Auth criaria: os triggers do cadastro rodam. */
export function createUser({
  id,
  email,
  meta = {},
}: {
  id: string;
  email: string;
  meta?: Record<string, string>;
}): string {
  return `insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', ${literal(id)}, 'authenticated',
    'authenticated', ${literal(email)}, '', now(),
    '{"provider":"email","providers":["email"]}', ${literal(JSON.stringify(meta))},
    now(), now(), '', '', '', ''
  );`;
}
