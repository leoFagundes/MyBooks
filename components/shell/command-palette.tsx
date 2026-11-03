"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  BookPlus,
  Compass,
  CornerDownLeft,
  House,
  Library,
  LibraryBig,
  Lightbulb,
  LoaderCircle,
  LogIn,
  MessagesSquare,
  Quote,
  ScanBarcode,
  Search,
  Settings,
  Shapes,
  Shuffle,
  SunMoon,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  commandGroupClasses as groupClasses,
  commandInputClasses,
  commandItemClasses as itemClasses,
} from "@/components/ui/command-styles";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCover } from "@/features/books/components/book-cover";
import type { BookVisual } from "@/features/books/types";
import { useNewCollection } from "@/features/collections/components/new-collection-provider";
import type { CollectionVisual } from "@/features/collections/types";
import { useAddBook } from "@/features/shelf/components/add-book/add-book-provider";
import { byline } from "@/features/shelf/components/add-book/chosen-book";
import { useNextRead } from "@/features/shelf/components/next-read/next-read-provider";
import { useCanScan } from "@/features/shelf/lib/use-can-scan";
import type { Reader } from "@/features/social/types";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { routes } from "@/lib/routes";
import { matchesText } from "@/lib/text-match";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useTheme } from "./theme-provider";

type PaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);
// Só o setter, que não muda: a barra avisa quem está logado
const AccountContext = createContext<
  ((username: string | null) => void) | null
>(null);

/** Paleta global: ⌘K / Ctrl+K em qualquer página (spec §5.11). */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext
      value={{ open, setOpen, toggle: () => setOpen((current) => !current) }}
    >
      <AccountContext value={setAccount}>{children}</AccountContext>
      <CommandPalette open={open} onOpenChange={setOpen} account={account} />
    </PaletteContext>
  );
}

export function useCommandPalette() {
  const context = use(PaletteContext);
  if (!context)
    throw new Error("useCommandPalette precisa do <CommandPaletteProvider>");
  return context;
}

/**
 * Fica na barra quando há conta: o ⌘K ganha os atalhos de quem está logado
 * (a estante, as coleções e as citações).
 */
export function CommandPaletteAccount({ username }: { username: string }) {
  const setAccount = use(AccountContext);
  if (!setAccount)
    throw new Error(
      "CommandPaletteAccount precisa do <CommandPaletteProvider>",
    );
  useEffect(() => {
    setAccount(username);
    return () => setAccount(null);
  }, [setAccount, username]);
  return null;
}

type SearchResults = {
  shelf: BookVisual[];
  books: BookVisual[];
  readers: Reader[];
  collections: CollectionVisual[];
};

async function fetchSearch(
  query: string,
  signal: AbortSignal,
): Promise<SearchResults> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Busca falhou (${response.status})`);
  return (await response.json()) as SearchResults;
}

type PaletteCommand = {
  id: string;
  label: string;
  /** Outras palavras que acham o comando ("escuro" acha Alternar tema). */
  keywords?: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
};

const books = (count: number) =>
  count === 1 ? "1 livro" : `${formatNumber(count)} livros`;

function BookItem({
  value,
  book,
  onSelect,
}: {
  value: string;
  book: BookVisual;
  onSelect: () => void;
}) {
  return (
    <Command.Item value={value} onSelect={onSelect} className={itemClasses}>
      <BookCover book={book} size="xs" tilt={false} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 font-serif text-base leading-snug">
          {book.title}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {byline(book)}
        </span>
      </span>
    </Command.Item>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1 px-3 py-2">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 py-1.5">
          <Skeleton className="h-15 w-10 rounded-cover" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: string | null;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-[12dvh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        // Sem DialogTrigger, o Radix não sabe a quem devolver o foco: guarda
        // quem estava focado ao abrir (o botão Buscar ou onde o ⌘K foi apertado)
        onOpenAutoFocus={() => {
          const active = document.activeElement;
          returnFocus.current = active instanceof HTMLElement ? active : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <PaletteBody account={account} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * O que a paleta mostra: sem busca, as ações e o "Ir para"; com busca, a
 * estante de quem vê, livros, leitores e coleções, e os comandos que casam.
 * Monta a cada vez que abre: a busca começa vazia.
 */
function PaletteBody({
  account,
  close,
}: {
  account: string | null;
  close: () => void;
}) {
  const router = useRouter();
  const { resolved, setPreference } = useTheme();
  const addBook = useAddBook();
  const nextRead = useNextRead();
  const newCollection = useNewCollection();
  const canScan = useCanScan();
  const [query, setQuery] = useState("");
  const term = query.trim().replace(/\s+/g, " ");
  const debounced = useDebouncedValue(term, 150);
  const searching = debounced.length >= 2;
  const search = useQuery({
    queryKey: ["busca-global", debounced.toLowerCase()],
    queryFn: ({ signal }) => fetchSearch(debounced, signal),
    enabled: searching,
    placeholderData: keepPreviousData,
  });

  function run(action: () => void) {
    close();
    action();
  }
  const go = (href: Route) => run(() => router.push(href));

  const actions: PaletteCommand[] = [
    ...(account
      ? [
          {
            id: "adicionar",
            label: "Adicionar livro",
            keywords: "novo estante",
            icon: BookPlus,
            shortcut: "N",
            run: () => run(addBook.open),
          },
          ...(canScan
            ? [
                {
                  id: "escanear",
                  label: "Escanear código de barras",
                  keywords: "isbn camera",
                  icon: ScanBarcode,
                  run: () => run(addBook.openScanner),
                },
              ]
            : []),
          {
            id: "colecao",
            label: "Nova coleção",
            keywords: "criar lista",
            icon: LibraryBig,
            run: () => run(newCollection),
          },
          {
            id: "sortear",
            label: "Sortear próxima leitura",
            keywords: "sorteio acaso quero ler",
            icon: Shuffle,
            run: () => run(() => nextRead.open()),
          },
        ]
      : []),
    {
      id: "tema",
      label: "Alternar tema",
      keywords: "escuro claro modo noturno",
      icon: SunMoon,
      run: () =>
        run(() => setPreference(resolved === "dark" ? "light" : "dark")),
    },
  ];

  const places: PaletteCommand[] = account
    ? [
        {
          id: "inicio",
          label: "Início",
          keywords: "feed",
          icon: House,
          run: () => go(routes.inicio),
        },
        {
          id: "explorar",
          label: "Explorar",
          icon: Compass,
          run: () => go(routes.explorar),
        },
        {
          id: "comunidade",
          label: "Comunidade",
          keywords: "fórum tópicos discussões",
          icon: MessagesSquare,
          run: () => go(routes.comunidade),
        },
        {
          id: "sugestoes",
          label: "Sugestões para o MyBooks",
          keywords: "ideias bugs melhorias",
          icon: Lightbulb,
          run: () => go(routes.sugestoes),
        },
        {
          id: "estante",
          label: "Minha estante",
          keywords: "perfil livros",
          icon: Library,
          run: () => go(routes.profile(account)),
        },
        {
          id: "colecoes",
          label: "Minhas coleções",
          icon: LibraryBig,
          run: () => go(routes.profileTab(account, "colecoes")),
        },
        {
          id: "citacoes",
          label: "Minhas citações",
          icon: Quote,
          run: () => go(routes.profileTab(account, "citacoes")),
        },
        {
          id: "configuracoes",
          label: "Configurações",
          keywords: "conta senha privacidade exportar importar goodreads",
          icon: Settings,
          run: () => go(routes.configuracoes),
        },
      ]
    : [
        {
          id: "explorar",
          label: "Explorar",
          icon: Compass,
          run: () => go(routes.explorar),
        },
        {
          id: "entrar",
          label: "Entrar",
          keywords: "login",
          icon: LogIn,
          run: () => go(routes.entrar),
        },
        {
          id: "cadastro",
          label: "Criar conta",
          keywords: "cadastro",
          icon: UserPlus,
          run: () => go(routes.cadastro),
        },
      ];
  if (process.env.NODE_ENV !== "production") {
    places.push({
      id: "dev",
      label: "Componentes",
      keywords: "dev vitrine",
      icon: Shapes,
      run: () => go(routes.dev),
    });
  }

  const matching = (list: PaletteCommand[]) =>
    term
      ? list.filter((command) =>
          matchesText(`${command.label} ${command.keywords ?? ""}`, term),
        )
      : list;
  const shownActions = matching(actions);
  const shownPlaces = matching(places);
  const results = searching ? search.data : undefined;

  // Os resultados chegam depois da letra digitada: quando o primeiro muda,
  // ele vem escolhido, e o Enter abre o que está no topo
  const keys = [
    ...(results?.shelf ?? []).map((book) => `estante:${book.id}`),
    ...(results?.books ?? []).map((book) => `livro:${book.id}`),
    ...(results?.readers ?? []).map((reader) => `leitor:${reader.id}`),
    ...(results?.collections ?? []).map((item) => `colecao:${item.id}`),
    ...shownActions.map((command) => `acao:${command.id}`),
    ...shownPlaces.map((command) => `ir:${command.id}`),
  ];
  const first = keys[0] ?? "";
  const [selected, setSelected] = useState(first);
  const [lastFirst, setLastFirst] = useState(first);
  if (lastFirst !== first) {
    setLastFirst(first);
    setSelected(first);
  }

  const waiting = searching && search.isPending;
  const nothing =
    term.length > 0 &&
    keys.length === 0 &&
    !waiting &&
    !search.isFetching &&
    !search.isError;

  const commandItems = (list: PaletteCommand[], prefix: string) =>
    list.map(({ id, label, icon: Icon, shortcut, run: onSelect }) => (
      <Command.Item
        key={id}
        value={`${prefix}:${id}`}
        onSelect={onSelect}
        className={itemClasses}
      >
        <Icon />
        {label}
        {shortcut ? <Kbd className="ml-auto">{shortcut}</Kbd> : null}
      </Command.Item>
    ));

  return (
    <Command
      label="Paleta de comandos"
      shouldFilter={false}
      loop
      value={selected}
      onValueChange={setSelected}
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        {searching && search.isFetching ? (
          <LoaderCircle
            className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar livros, pessoas e coleções…"
          className={commandInputClasses}
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain p-2">
        {waiting ? <ResultsSkeleton /> : null}
        {results && results.shelf.length > 0 ? (
          <Command.Group heading="Na sua estante" className={groupClasses}>
            {results.shelf.map((book) => (
              <BookItem
                key={book.id}
                value={`estante:${book.id}`}
                book={book}
                onSelect={() => go(routes.book(book.id))}
              />
            ))}
          </Command.Group>
        ) : null}
        {results && results.books.length > 0 ? (
          <Command.Group heading="Livros" className={groupClasses}>
            {results.books.map((book) => (
              <BookItem
                key={book.id}
                value={`livro:${book.id}`}
                book={book}
                onSelect={() => go(routes.book(book.id))}
              />
            ))}
          </Command.Group>
        ) : null}
        {results && results.readers.length > 0 ? (
          <Command.Group heading="Leitores" className={groupClasses}>
            {results.readers.map((reader) => (
              <Command.Item
                key={reader.id}
                value={`leitor:${reader.id}`}
                onSelect={() => go(routes.profile(reader.username))}
                className={itemClasses}
              >
                <Avatar className="size-8">
                  {reader.avatarUrl ? (
                    <AvatarImage src={reader.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {initials(reader.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate">{reader.displayName}</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    @{reader.username}
                  </span>
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {results && results.collections.length > 0 ? (
          <Command.Group heading="Coleções" className={groupClasses}>
            {results.collections.map((collection) => (
              <Command.Item
                key={collection.id}
                value={`colecao:${collection.id}`}
                onSelect={() => go(routes.collection(collection.id))}
                className={itemClasses}
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-control bg-muted text-base"
                >
                  {collection.emoji ?? <LibraryBig />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-serif text-base leading-snug">
                    {collection.title}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    por @{collection.owner.username} ·{" "}
                    {books(collection.bookCount)}
                  </span>
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {searching && search.isError ? (
          <p className="px-3 py-2.5 text-xs text-pretty text-muted-foreground">
            A busca não respondeu agora. Os comandos continuam aqui.
          </p>
        ) : null}
        {shownActions.length > 0 ? (
          <Command.Group heading="Ações" className={groupClasses}>
            {commandItems(shownActions, "acao")}
          </Command.Group>
        ) : null}
        {shownPlaces.length > 0 ? (
          <Command.Group heading="Ir para" className={groupClasses}>
            {commandItems(shownPlaces, "ir")}
          </Command.Group>
        ) : null}
        {nothing ? (
          <p className="px-3 py-10 text-center text-sm text-pretty text-muted-foreground">
            Nada com “{term}”
          </p>
        ) : null}
      </Command.List>
      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          navegar
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>
            <CornerDownLeft className="size-3" aria-hidden />
          </Kbd>
          escolher
        </span>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          abre e fecha
        </span>
      </div>
    </Command>
  );
}
