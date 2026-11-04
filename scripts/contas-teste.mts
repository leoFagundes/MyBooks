// As contas de teste do MyBooks: apaga as das sondas ("Sonda …") e dá às que
// ficam (devteste, helenaprado e as "Teo Teste") estante, coleções e
// citações de livros reais. Pode rodar de novo: o que já existe não duplica.
// npm run contas:teste
import { createClient } from "@supabase/supabase-js";
import { generateNKeysBetween } from "fractional-indexing";
import type { Database } from "../lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Faltam as variáveis do Supabase");
const admin = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Shelf = {
  title: string;
  status: "read" | "reading" | "want" | "abandoned";
  rating?: number;
  review?: string;
  page?: number;
};
type Plan = {
  shelf: Shelf[];
  collections: {
    title: string;
    emoji: string;
    description: string;
    books: string[];
  }[];
  quotes: { title: string; text: string }[];
};

// Frases conhecidas dos próprios livros, sem página inventada
const QUOTES: Record<string, string> = {
  "Grande Sertão: Veredas": "Viver é muito perigoso.",
  "Memórias Póstumas de Brás Cubas":
    "Não tive filhos, não transmiti a nenhuma criatura o legado da nossa miséria.",
  "A Hora da Estrela": "Tudo no mundo começou com um sim.",
  "Vidas Secas": "Fabiano, você é um homem.",
  "1984": "Guerra é paz. Liberdade é escravidão. Ignorância é força.",
  "O Alquimista":
    "Quando você quer alguma coisa, todo o Universo conspira para que você realize o seu desejo.",
  "Cem Anos de Solidão":
    "Muitos anos depois, diante do pelotão de fuzilamento, o coronel Aureliano Buendía havia de recordar aquela tarde remota em que seu pai o levou para conhecer o gelo.",
  Duna: "Não terei medo. O medo mata a mente.",
  "O Pequeno Príncipe":
    "Tu te tornas eternamente responsável por aquilo que cativas.",
  "Harry Potter e a Pedra Filosofal":
    "Não faz bem viver sonhando e se esquecer de viver.",
  "A Metamorfose":
    "Quando certa manhã Gregor Samsa acordou de sonhos intranquilos, encontrou-se em sua cama metamorfoseado num inseto monstruoso.",
  "O Hobbit": "Numa toca no chão vivia um hobbit.",
};

const quotesOf = (...titles: string[]) =>
  titles.map((title) => ({ title, text: QUOTES[title] as string }));

const PLANS: Record<string, Plan> = {
  devteste: {
    shelf: [
      {
        title: "O Pequeno Príncipe",
        status: "read",
        rating: 5,
        review: "Releio de tempos em tempos e sempre acho uma frase nova.",
      },
      { title: "A Metamorfose", status: "read", rating: 4 },
      { title: "O Nome da Rosa", status: "reading", page: 214 },
      { title: "Sapiens", status: "want" },
      { title: "Crime e Castigo", status: "want" },
      { title: "O Hobbit", status: "read", rating: 4.5 },
    ],
    collections: [
      {
        title: "Para ler numa tarde",
        emoji: "☕",
        description: "Curtos, de uma sentada só.",
        books: ["O Pequeno Príncipe", "A Metamorfose", "A Hora da Estrela"],
      },
    ],
    quotes: quotesOf("O Pequeno Príncipe", "A Metamorfose", "O Hobbit", "1984"),
  },
  helenaprado: {
    shelf: [],
    collections: [
      {
        title: "Ficção científica que envelheceu bem",
        emoji: "🚀",
        description:
          "Futuros pensados há décadas que ainda dizem muito sobre hoje.",
        books: [
          "Duna",
          "Fundação",
          "1984",
          "Admirável Mundo Novo",
          "Fahrenheit 451",
        ],
      },
      {
        title: "Clássicos brasileiros para começar",
        emoji: "📚",
        description: "Uma porta de entrada para quem quer ler os brasileiros.",
        books: [
          "Dom Casmurro",
          "Memórias Póstumas de Brás Cubas",
          "Vidas Secas",
          "A Hora da Estrela",
        ],
      },
    ],
    quotes: quotesOf(
      "Duna",
      "1984",
      "Memórias Póstumas de Brás Cubas",
      "Vidas Secas",
      "A Hora da Estrela",
    ),
  },
  teo: {
    shelf: [
      {
        title: "Cem Anos de Solidão",
        status: "read",
        rating: 5,
        review:
          "Precisei desenhar a árvore da família Buendía, e valeu cada página.",
      },
      { title: "Grande Sertão: Veredas", status: "reading", page: 132 },
      { title: "O Alquimista", status: "read", rating: 3 },
      { title: "Duna", status: "read", rating: 4.5 },
      { title: "Torto Arado", status: "want" },
      { title: "Ensaio sobre a Cegueira", status: "want" },
      { title: "O Senhor dos Anéis", status: "abandoned" },
      { title: "Harry Potter e a Pedra Filosofal", status: "read", rating: 4 },
      { title: "Capitães da Areia", status: "read", rating: 4 },
      { title: "O Cortiço", status: "want" },
    ],
    collections: [
      {
        title: "Realismo mágico",
        emoji: "✨",
        description: "Quando o impossível acontece e ninguém estranha.",
        books: ["Cem Anos de Solidão", "A Casa dos Espíritos", "Macunaíma"],
      },
      {
        title: "Fantasia para maratonar",
        emoji: "🐉",
        description: "Mundos inteiros para se perder num fim de semana.",
        books: ["O Hobbit", "Harry Potter e a Pedra Filosofal", "Duna"],
      },
    ],
    quotes: quotesOf(
      "Cem Anos de Solidão",
      "Grande Sertão: Veredas",
      "Duna",
      "O Alquimista",
    ),
  },
};

async function bookIds() {
  const { data, error } = await admin
    .from("books")
    .select("id, title")
    .is("deleted_at", null)
    .eq("moderation_status", "approved");
  if (error) throw error;
  return new Map(data.map((book) => [book.title, book.id]));
}

async function removeProbes() {
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, display_name")
    .like("display_name", "Sonda%");
  if (error) throw error;
  for (const probe of data) {
    const { data: files } = await admin.storage.from("avatars").list(probe.id);
    if (files?.length) {
      await admin.storage
        .from("avatars")
        .remove(files.map((file) => `${probe.id}/${file.name}`));
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(probe.id);
    if (deleteError) throw deleteError;
  }
  return data.length;
}

async function enrich(userId: string, plan: Plan, books: Map<string, string>) {
  const id = (title: string) => {
    const found = books.get(title);
    if (!found) throw new Error(`Livro fora do catálogo: ${title}`);
    return found;
  };
  if (plan.shelf.length) {
    const { error } = await admin.from("user_books").upsert(
      plan.shelf.map((entry) => ({
        user_id: userId,
        book_id: id(entry.title),
        status: entry.status,
        rating: entry.rating ?? null,
        review: entry.review ?? null,
        current_page: entry.page ?? null,
        started_at: entry.status === "want" ? null : "2026-09-01",
        finished_at: entry.status === "read" ? "2026-10-12" : null,
      })),
      { onConflict: "user_id,book_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  // As coleções e citações também põem os livros na estante (se faltarem)
  const wanted = [
    ...plan.collections.flatMap((collection) => collection.books),
    ...plan.quotes.map((quote) => quote.title),
  ];
  await admin.from("user_books").upsert(
    [...new Set(wanted)].map((title) => ({
      user_id: userId,
      book_id: id(title),
      status: "read",
      started_at: "2026-08-01",
      finished_at: "2026-08-20",
    })),
    { onConflict: "user_id,book_id", ignoreDuplicates: true },
  );

  for (const collection of plan.collections) {
    const { data: existing } = await admin
      .from("collections")
      .select("id")
      .eq("owner_id", userId)
      .eq("title", collection.title)
      .maybeSingle();
    if (existing) continue;
    const { data: created, error } = await admin
      .from("collections")
      .insert({
        owner_id: userId,
        title: collection.title,
        emoji: collection.emoji,
        description: collection.description,
        visibility: "public",
      })
      .select("id")
      .single();
    if (error) throw error;
    const positions = generateNKeysBetween(null, null, collection.books.length);
    const { error: itemsError } = await admin.from("collection_items").insert(
      collection.books.map((title, index) => ({
        collection_id: created.id,
        book_id: id(title),
        position: positions[index] as string,
        added_by: userId,
      })),
    );
    if (itemsError) throw itemsError;
  }

  const { data: saved } = await admin
    .from("quotes")
    .select("text")
    .eq("user_id", userId);
  const known = new Set((saved ?? []).map((quote) => quote.text));
  const fresh = plan.quotes.filter((quote) => !known.has(quote.text));
  if (fresh.length) {
    const { error } = await admin.from("quotes").insert(
      fresh.map((quote) => ({
        user_id: userId,
        book_id: id(quote.title),
        text: quote.text,
      })),
    );
    if (error) throw error;
  }
}

const removed = await removeProbes();
const books = await bookIds();
const { data: people, error } = await admin
  .from("profiles")
  .select("id, username, display_name")
  .or("username.eq.devteste,username.eq.helenaprado,display_name.eq.Teo Teste")
  // As de teste ficaram de outubro; as dos E2E de agora vêm e vão sozinhas
  .lt("created_at", "2026-11-01");
if (error) throw error;
for (const person of people) {
  const plan =
    person.username === "devteste"
      ? PLANS.devteste
      : person.username === "helenaprado"
        ? PLANS.helenaprado
        : PLANS.teo;
  await enrich(person.id, plan as Plan, books);
  console.log(`@${person.username}: pronto`);
}
console.log(`${removed} contas de sonda apagadas.`);
