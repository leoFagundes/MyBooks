import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/ui/prose";
import libraries from "@/features/credits/libraries.json";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Créditos",
  description:
    "Quem faz o MyBooks funcionar: as fontes dos livros, os serviços, as fontes tipográficas e as bibliotecas de código aberto.",
};

type Library = { name: string; license: string; url: string };

// Nomes, licenças e links; nada de versões, rotas internas ou configurações
// (MELHORIAS 9.2: o que dá pistas de ataque fica de fora)
const SERVICES = [
  {
    name: "Vercel",
    url: "https://vercel.com",
    role: "hospeda o site e mede o desempenho, sem cookies",
  },
  {
    name: "Supabase",
    url: "https://supabase.com",
    role: "guarda as contas, as estantes e as imagens",
  },
  {
    name: "Resend",
    url: "https://resend.com",
    role: "entrega os e-mails da conta",
  },
  {
    name: "Google",
    url: "https://developers.google.com/identity",
    role: "permite entrar com a conta Google",
  },
];

const FONTS = [
  {
    name: "Instrument Serif",
    url: "https://fonts.google.com/specimen/Instrument+Serif",
    license: "OFL-1.1",
  },
  { name: "Geist", url: "https://vercel.com/font", license: "OFL-1.1" },
  { name: "Geist Mono", url: "https://vercel.com/font", license: "OFL-1.1" },
];

function LibraryList({ items }: { items: Library[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {items.map((library) => (
        <li
          key={library.name}
          className="flex min-w-0 items-baseline justify-between gap-3 border-b border-border pb-2"
        >
          <a
            href={library.url}
            className="min-w-0 truncate font-mono text-sm"
            rel="noreferrer"
          >
            {library.name}
          </a>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {library.license}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Os créditos do MyBooks (MELHORIAS 9.2). */
export default function CreditsPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex max-w-prose flex-col gap-3">
        <p className="font-mono text-xs text-muted-foreground">Créditos</p>
        <h1 className="font-serif text-5xl leading-tight tracking-tight text-balance sm:text-6xl">
          Feito com bibliotecas dos outros.
        </h1>
        <p className="text-pretty text-muted-foreground">
          O MyBooks se apoia em bibliotecas abertas, em serviços generosos e em
          muita gente que compartilha o que sabe. Aqui está quem faz tudo isso
          funcionar.
        </p>
      </header>

      <Prose>
        <h2>Os dados dos livros</h2>
        <p>
          Títulos, autorias, capas e descrições vêm da{" "}
          <a href="https://openlibrary.org" rel="noreferrer">
            Open Library
          </a>
          , um projeto do{" "}
          <a href="https://archive.org" rel="noreferrer">
            Internet Archive
          </a>
          , com dados abertos para todo mundo. Quando ela não acha um livro, a
          busca pergunta ao{" "}
          <a href="https://books.google.com" rel="noreferrer">
            Google Books
          </a>{" "}
          (powered by Google). Os livros que faltam lá, os próprios leitores
          cadastram.
        </p>

        <h2>Os serviços</h2>
        <ul>
          {SERVICES.map((service) => (
            <li key={service.name}>
              <a href={service.url} rel="noreferrer">
                {service.name}
              </a>
              : {service.role}.
            </li>
          ))}
        </ul>

        <h2>Letras e ícones</h2>
        <ul>
          {FONTS.map((font) => (
            <li key={font.name}>
              <a href={font.url} rel="noreferrer">
                {font.name}
              </a>{" "}
              <span className="font-mono text-xs text-muted-foreground">
                {font.license}
              </span>
            </li>
          ))}
          <li>
            Ícones do{" "}
            <a href="https://lucide.dev" rel="noreferrer">
              Lucide
            </a>{" "}
            <span className="font-mono text-xs text-muted-foreground">ISC</span>
          </li>
        </ul>
      </Prose>

      <section aria-labelledby="bibliotecas" className="flex flex-col gap-6">
        <div className="flex max-w-prose flex-col gap-2">
          <h2
            id="bibliotecas"
            className="font-serif text-3xl tracking-tight text-balance"
          >
            Código aberto
          </h2>
          <p className="text-pretty text-muted-foreground">
            As bibliotecas que vão para o seu navegador e para o servidor, com
            as licenças delas. A lista sai do próprio projeto a cada
            atualização.
          </p>
        </div>
        <LibraryList items={libraries.app} />
        <h3 className="font-medium">E as que ajudam a construir o MyBooks</h3>
        <LibraryList items={libraries.build} />
      </section>

      <p className="max-w-prose text-sm text-pretty text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground">
        Leia também os <Link href={routes.termos}>termos de uso</Link> e a{" "}
        <Link href={routes.privacidade}>política de privacidade</Link>.
      </p>
    </div>
  );
}
