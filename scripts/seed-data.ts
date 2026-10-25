import type { GenreSlug } from "../features/profile/genres";

// Conteúdo do seed: o que é escrito à mão (títulos em pt-BR, sinopses,
// leitores, estantes, resenhas, citações e coleções). O id da obra, a capa,
// as páginas e o ISBN vêm da Open Library, buscados pelo gerar-seed.ts.

export type SeedBook = {
  slug: string;
  title: string;
  subtitle?: string;
  authors: string[];
  /** Como a obra aparece na Open Library (muitas vezes, no idioma original). */
  search: { title: string; author: string };
  /** Obra fixada quando a busca acha uma edição secundária. */
  work?: string;
  /** Capa fixada pelo id da Open Library (as das demos), ou null sem capa. */
  cover?: number | null;
  pageCount?: number;
  publishedYear: number;
  genres: GenreSlug[];
  description: string;
};

export type ShelfStatus = "read" | "reading" | "want" | "abandoned";

export type SeedShelfEntry = {
  book: string;
  status: ShelfStatus;
  rating?: number;
  review?: string;
  /** Há quantos dias entrou na estante (lido: terminou nesse dia). */
  daysAgo: number;
  currentPage?: number;
  copiedFrom?: string;
};

export type SeedReader = {
  username: string;
  displayName: string;
  bio: string;
  genres: GenreSlug[];
  isPrivate?: boolean;
  joinedDaysAgo: number;
  shelf: SeedShelfEntry[];
};

export type SeedQuote = {
  reader: string;
  book: string;
  text: string;
  daysAgo: number;
};

export type SeedFollow = {
  from: string;
  to: string;
  daysAgo: number;
  /** Só faz sentido para perfil privado: o pedido fica esperando. */
  pending?: boolean;
};

export type SeedCollection = {
  slug: string;
  owner: string;
  title: string;
  emoji?: string;
  description?: string;
  visibility: "public" | "private";
  collaborative?: boolean;
  members?: string[];
  copiedFrom?: string;
  daysAgo: number;
  books: { slug: string; note?: string; addedBy?: string }[];
  likes?: string[];
  saves?: string[];
};

export const SEED_BOOKS: SeedBook[] = [
  {
    slug: "dom-casmurro",
    title: "Dom Casmurro",
    authors: ["Machado de Assis"],
    search: { title: "Dom Casmurro", author: "Machado de Assis" },
    cover: 647501,
    pageCount: 268,
    publishedYear: 1899,
    genres: ["literatura-brasileira", "classicos", "romance"],
    description:
      "Bento Santiago, já velho, conta a própria vida para entender um ciúme que nunca o largou: Capitu, a menina dos olhos de ressaca, traiu ou não traiu?",
  },
  {
    slug: "memorias-postumas-de-bras-cubas",
    title: "Memórias Póstumas de Brás Cubas",
    authors: ["Machado de Assis"],
    search: {
      title: "Memórias póstumas de Brás Cubas",
      author: "Machado de Assis",
    },
    cover: 123152,
    pageCount: 242,
    publishedYear: 1881,
    genres: ["literatura-brasileira", "classicos"],
    description:
      "Um defunto autor narra a própria vida com ironia, sem pressa e sem medo de ofender, num dos romances mais modernos do século XIX.",
  },
  {
    slug: "a-hora-da-estrela",
    title: "A Hora da Estrela",
    authors: ["Clarice Lispector"],
    search: { title: "A hora da estrela", author: "Clarice Lispector" },
    cover: 650866,
    pageCount: 96,
    publishedYear: 1977,
    genres: ["literatura-brasileira", "ficcao"],
    description:
      "Rodrigo S.M. tenta escrever a história de Macabéa, nordestina pobre no Rio de Janeiro, e acaba escrevendo sobre o próprio ato de narrar.",
  },
  {
    slug: "a-paixao-segundo-gh",
    title: "A Paixão Segundo G.H.",
    authors: ["Clarice Lispector"],
    search: { title: "A paixão segundo G.H.", author: "Clarice Lispector" },
    cover: null,
    pageCount: 176,
    publishedYear: 1964,
    genres: ["literatura-brasileira", "ficcao", "filosofia"],
    description:
      "Uma escultora entra no quarto da empregada que foi embora e, diante de uma barata, atravessa uma experiência que desmonta o que achava saber sobre si.",
  },
  {
    slug: "torto-arado",
    title: "Torto Arado",
    authors: ["Itamar Vieira Junior"],
    search: { title: "Torto arado", author: "Itamar Vieira Junior" },
    cover: 12369648,
    pageCount: 280,
    publishedYear: 2019,
    genres: ["literatura-brasileira", "ficcao"],
    description:
      "Duas irmãs crescem numa fazenda do sertão baiano, unidas por um acidente na infância e pela luta por terra, memória e voz.",
  },
  {
    slug: "grande-sertao-veredas",
    title: "Grande Sertão: Veredas",
    authors: ["João Guimarães Rosa"],
    search: { title: "Grande sertão", author: "Guimarães Rosa" },
    cover: 13909068,
    pageCount: 504,
    publishedYear: 1956,
    genres: ["literatura-brasileira", "classicos"],
    description:
      "Riobaldo, ex-jagunço, conta a um ouvinte silencioso suas andanças pelo sertão, o pacto que talvez tenha feito e o amor por Diadorim.",
  },
  {
    slug: "vidas-secas",
    title: "Vidas Secas",
    authors: ["Graciliano Ramos"],
    search: { title: "Vidas secas", author: "Graciliano Ramos" },
    cover: 12369687,
    pageCount: 155,
    publishedYear: 1938,
    genres: ["literatura-brasileira", "classicos"],
    description:
      "Fabiano, sinhá Vitória, os dois meninos e a cachorra Baleia fogem da seca pelo sertão, numa prosa seca como a paisagem.",
  },
  {
    slug: "quarto-de-despejo",
    title: "Quarto de Despejo",
    subtitle: "Diário de uma favelada",
    authors: ["Carolina Maria de Jesus"],
    search: { title: "Quarto de despejo", author: "Carolina Maria de Jesus" },
    pageCount: 200,
    publishedYear: 1960,
    genres: ["literatura-brasileira", "biografia"],
    description:
      "O diário de Carolina Maria de Jesus na favela do Canindé, em São Paulo: a fome, os filhos, o papel catado na rua e a escrita como resistência.",
  },
  {
    slug: "macunaima",
    title: "Macunaíma",
    subtitle: "O herói sem nenhum caráter",
    authors: ["Mário de Andrade"],
    search: { title: "Macunaíma", author: "Mário de Andrade" },
    publishedYear: 1928,
    genres: ["literatura-brasileira", "classicos", "realismo-magico"],
    description:
      "O herói sem nenhum caráter nasce na mata, vai a São Paulo atrás de um amuleto e mistura mitos, línguas e piadas do Brasil inteiro.",
  },
  {
    slug: "capitaes-da-areia",
    title: "Capitães da Areia",
    authors: ["Jorge Amado"],
    search: { title: "Capitães da areia", author: "Jorge Amado" },
    publishedYear: 1937,
    genres: ["literatura-brasileira", "ficcao"],
    description:
      "Um bando de meninos abandonados vive num trapiche de Salvador, entre pequenos furtos, liberdade e a dureza das ruas.",
  },
  {
    slug: "o-quinze",
    title: "O Quinze",
    authors: ["Rachel de Queiroz"],
    search: { title: "O quinze", author: "Rachel de Queiroz" },
    publishedYear: 1930,
    genres: ["literatura-brasileira", "classicos"],
    description:
      "A seca de 1915 no Ceará atravessa a vida de Conceição, professora, e da família do vaqueiro Chico Bento, obrigada a migrar.",
  },
  {
    slug: "iracema",
    title: "Iracema",
    subtitle: "Lenda do Ceará",
    authors: ["José de Alencar"],
    search: { title: "Iracema", author: "José de Alencar" },
    publishedYear: 1865,
    genres: ["literatura-brasileira", "classicos", "romance"],
    description:
      "A lenda da virgem dos lábios de mel e do guerreiro português Martim, que José de Alencar transformou num mito de fundação do Ceará.",
  },
  {
    slug: "o-cortico",
    title: "O Cortiço",
    authors: ["Aluísio Azevedo"],
    search: { title: "O cortiço", author: "Aluísio Azevedo" },
    work: "OL7058886W",
    publishedYear: 1890,
    genres: ["literatura-brasileira", "classicos"],
    description:
      "Num cortiço do Rio de Janeiro do século XIX, a ambição de João Romão e a vida coletiva dos moradores mostram o naturalismo em estado bruto.",
  },
  {
    slug: "o-alquimista",
    title: "O Alquimista",
    authors: ["Paulo Coelho"],
    search: { title: "O alquimista", author: "Paulo Coelho" },
    publishedYear: 1988,
    genres: ["literatura-brasileira", "ficcao"],
    description:
      "Santiago, um jovem pastor andaluz, atravessa o deserto atrás de um tesouro e aprende a ouvir os sinais do caminho.",
  },
  {
    slug: "1984",
    title: "1984",
    authors: ["George Orwell"],
    search: { title: "Nineteen Eighty-Four", author: "George Orwell" },
    cover: 9267242,
    pageCount: 318,
    publishedYear: 1949,
    genres: ["distopia", "ficcao-cientifica", "classicos"],
    description:
      "Winston Smith trabalha reescrevendo o passado para o Partido e, sob o olhar do Grande Irmão, ousa pensar por conta própria.",
  },
  {
    slug: "a-revolucao-dos-bichos",
    title: "A Revolução dos Bichos",
    authors: ["George Orwell"],
    search: { title: "Animal Farm", author: "George Orwell" },
    publishedYear: 1945,
    genres: ["distopia", "classicos"],
    description:
      "Os animais de uma granja expulsam o dono e prometem igualdade, até que os porcos começam a mudar as regras.",
  },
  {
    slug: "admiravel-mundo-novo",
    title: "Admirável Mundo Novo",
    authors: ["Aldous Huxley"],
    search: { title: "Brave New World", author: "Aldous Huxley" },
    publishedYear: 1932,
    genres: ["distopia", "ficcao-cientifica"],
    description:
      "Num futuro de felicidade fabricada, castas planejadas e soma para todos, um selvagem chega para lembrar o que se perdeu.",
  },
  {
    slug: "fahrenheit-451",
    title: "Fahrenheit 451",
    authors: ["Ray Bradbury"],
    search: { title: "Fahrenheit 451", author: "Ray Bradbury" },
    publishedYear: 1953,
    genres: ["distopia", "ficcao-cientifica"],
    description:
      "Guy Montag é bombeiro num mundo onde os livros são proibidos e o trabalho é queimá-los, até que começa a ler.",
  },
  {
    slug: "o-conto-da-aia",
    title: "O Conto da Aia",
    authors: ["Margaret Atwood"],
    search: { title: "The Handmaid's Tale", author: "Margaret Atwood" },
    publishedYear: 1985,
    genres: ["distopia", "ficcao"],
    description:
      "Na República de Gilead, Offred é obrigada a gerar filhos para a elite e guarda, em segredo, a memória da vida de antes.",
  },
  {
    slug: "duna",
    title: "Duna",
    authors: ["Frank Herbert"],
    search: { title: "Dune", author: "Frank Herbert" },
    cover: 11481354,
    pageCount: 608,
    publishedYear: 1965,
    genres: ["ficcao-cientifica"],
    description:
      "Paul Atreides chega a Arrakis, o planeta deserto que guarda a especiaria mais valiosa do universo, e se vê no centro de uma guerra e de uma profecia.",
  },
  {
    slug: "fundacao",
    title: "Fundação",
    authors: ["Isaac Asimov"],
    search: { title: "Foundation", author: "Isaac Asimov" },
    publishedYear: 1951,
    genres: ["ficcao-cientifica"],
    description:
      "O matemático Hari Seldon prevê a queda do Império Galáctico e cria uma fundação para encurtar a idade das trevas que virá.",
  },
  {
    slug: "o-hobbit",
    title: "O Hobbit",
    authors: ["J. R. R. Tolkien"],
    search: { title: "The Hobbit", author: "J.R.R. Tolkien" },
    cover: 14627509,
    pageCount: 310,
    publishedYear: 1937,
    genres: ["fantasia", "infantojuvenil"],
    description:
      "Bilbo Bolseiro, que só queria sossego, parte com treze anões e um mago para recuperar um tesouro guardado por um dragão.",
  },
  {
    slug: "a-sociedade-do-anel",
    title: "O Senhor dos Anéis",
    subtitle: "A Sociedade do Anel",
    authors: ["J. R. R. Tolkien"],
    search: { title: "The Fellowship of the Ring", author: "J.R.R. Tolkien" },
    publishedYear: 1954,
    genres: ["fantasia"],
    description:
      "Frodo herda um anel perigoso demais para existir e parte com oito companheiros para destruí-lo, atravessando a Terra-média.",
  },
  {
    slug: "harry-potter-e-a-pedra-filosofal",
    title: "Harry Potter e a Pedra Filosofal",
    authors: ["J. K. Rowling"],
    search: {
      title: "Harry Potter and the Philosopher's Stone",
      author: "J. K. Rowling",
    },
    publishedYear: 1997,
    genres: ["fantasia", "infantojuvenil"],
    description:
      "No aniversário de onze anos, Harry descobre que é bruxo e vai estudar em Hogwarts, onde um mistério cerca a pedra filosofal.",
  },
  {
    slug: "cem-anos-de-solidao",
    title: "Cem Anos de Solidão",
    authors: ["Gabriel García Márquez"],
    search: { title: "Cien años de soledad", author: "Gabriel García Márquez" },
    cover: 12627383,
    pageCount: 432,
    publishedYear: 1967,
    genres: ["realismo-magico", "classicos"],
    description:
      "Sete gerações da família Buendía vivem, amam e se repetem em Macondo, a cidade onde o extraordinário é rotina.",
  },
  {
    slug: "a-casa-dos-espiritos",
    title: "A Casa dos Espíritos",
    authors: ["Isabel Allende"],
    search: { title: "La casa de los espíritus", author: "Isabel Allende" },
    publishedYear: 1982,
    genres: ["realismo-magico", "romance"],
    description:
      "A saga da família Trueba ao longo de quatro gerações no Chile, entre amor, política e uma clarividente que conversa com os espíritos.",
  },
  {
    slug: "ensaio-sobre-a-cegueira",
    title: "Ensaio sobre a Cegueira",
    authors: ["José Saramago"],
    search: { title: "Ensaio sobre a cegueira", author: "José Saramago" },
    cover: 10482411,
    pageCount: 352,
    publishedYear: 1995,
    genres: ["ficcao", "distopia"],
    description:
      "Uma epidemia de cegueira branca se espalha por uma cidade, e só uma mulher continua vendo o que as pessoas se tornam.",
  },
  {
    slug: "o-pequeno-principe",
    title: "O Pequeno Príncipe",
    authors: ["Antoine de Saint-Exupéry"],
    search: { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry" },
    cover: 10708272,
    pageCount: 96,
    publishedYear: 1943,
    genres: ["infantojuvenil", "classicos", "filosofia"],
    description:
      "Um aviador perdido no deserto conhece um menino vindo de um asteroide, que fala de uma rosa, de uma raposa e do que é essencial.",
  },
  {
    slug: "orgulho-e-preconceito",
    title: "Orgulho e Preconceito",
    authors: ["Jane Austen"],
    search: { title: "Pride and Prejudice", author: "Jane Austen" },
    publishedYear: 1813,
    genres: ["romance", "classicos"],
    description:
      "Elizabeth Bennet e o orgulhoso senhor Darcy se estranham, se julgam mal e aprendem, devagar, a enxergar um ao outro.",
  },
  {
    slug: "a-metamorfose",
    title: "A Metamorfose",
    authors: ["Franz Kafka"],
    search: { title: "Die Verwandlung", author: "Franz Kafka" },
    work: "OL498556W",
    publishedYear: 1915,
    genres: ["classicos", "ficcao"],
    description:
      "Gregor Samsa acorda transformado num inseto monstruoso e passa a ser um estorvo para a família que sustentava.",
  },
  {
    slug: "crime-e-castigo",
    title: "Crime e Castigo",
    authors: ["Fiódor Dostoiévski"],
    search: { title: "Crime and Punishment", author: "Fyodor Dostoevsky" },
    work: "OL166894W",
    publishedYear: 1866,
    genres: ["classicos", "ficcao", "filosofia"],
    description:
      "Raskólnikov, estudante pobre de São Petersburgo, mata uma velha agiota convencido de uma teoria e passa a ser consumido pela culpa.",
  },
  {
    slug: "dom-quixote",
    title: "Dom Quixote",
    authors: ["Miguel de Cervantes"],
    search: { title: "Don Quixote", author: "Miguel de Cervantes" },
    work: "OL503666W",
    publishedYear: 1605,
    genres: ["classicos"],
    description:
      "Um fidalgo que leu romances de cavalaria demais sai pela Espanha como cavaleiro andante, ao lado do fiel e prático Sancho Pança.",
  },
  {
    slug: "frankenstein",
    title: "Frankenstein",
    subtitle: "ou o Prometeu Moderno",
    authors: ["Mary Shelley"],
    search: { title: "Frankenstein", author: "Mary Shelley" },
    publishedYear: 1818,
    genres: ["terror", "ficcao-cientifica", "classicos"],
    description:
      "Victor Frankenstein dá vida a uma criatura feita de partes de cadáveres e foge dela, até que a criatura exige uma resposta.",
  },
  {
    slug: "dracula",
    title: "Drácula",
    authors: ["Bram Stoker"],
    search: { title: "Dracula", author: "Bram Stoker" },
    publishedYear: 1897,
    genres: ["terror", "classicos"],
    description:
      "Por cartas e diários, um grupo de pessoas descobre que um conde da Transilvânia chegou a Londres e decide caçá-lo.",
  },
  {
    slug: "o-iluminado",
    title: "O Iluminado",
    authors: ["Stephen King"],
    search: { title: "The Shining", author: "Stephen King" },
    publishedYear: 1977,
    genres: ["terror"],
    description:
      "Jack Torrance aceita cuidar de um hotel isolado durante o inverno, com a mulher e o filho, que tem um dom e percebe o que o lugar esconde.",
  },
  {
    slug: "assassinato-no-expresso-do-oriente",
    title: "Assassinato no Expresso do Oriente",
    authors: ["Agatha Christie"],
    search: {
      title: "Murder on the Orient Express",
      author: "Agatha Christie",
    },
    publishedYear: 1934,
    genres: ["misterio"],
    description:
      "Um passageiro aparece morto num trem preso pela neve, e Hercule Poirot precisa descobrir quem, entre todos a bordo, é o culpado.",
  },
  {
    slug: "o-nome-da-rosa",
    title: "O Nome da Rosa",
    authors: ["Umberto Eco"],
    search: { title: "Il nome della rosa", author: "Umberto Eco" },
    publishedYear: 1980,
    genres: ["misterio", "historia"],
    description:
      "Num mosteiro italiano do século XIV, o frade Guilherme de Baskerville investiga mortes ligadas a uma biblioteca labiríntica.",
  },
  {
    slug: "sapiens",
    title: "Sapiens",
    subtitle: "Uma breve história da humanidade",
    authors: ["Yuval Noah Harari"],
    search: { title: "Sapiens", author: "Yuval Noah Harari" },
    cover: 8634250,
    pageCount: 456,
    publishedYear: 2011,
    genres: ["historia", "ciencia"],
    description:
      "Uma história da humanidade das cavernas ao presente, contada pelas revoluções cognitiva, agrícola e científica.",
  },
  {
    slug: "o-diario-de-anne-frank",
    title: "O Diário de Anne Frank",
    authors: ["Anne Frank"],
    search: { title: "The Diary of a Young Girl", author: "Anne Frank" },
    work: "OL266178W",
    publishedYear: 1947,
    genres: ["biografia", "historia"],
    description:
      "Escondida com a família num anexo secreto em Amsterdã durante a ocupação nazista, Anne escreve sobre medo, convivência e o desejo de ser escritora.",
  },
  {
    slug: "persepolis",
    title: "Persépolis",
    authors: ["Marjane Satrapi"],
    search: { title: "Persepolis", author: "Marjane Satrapi" },
    publishedYear: 2000,
    genres: ["quadrinhos", "biografia"],
    description:
      "Em quadrinhos em preto e branco, Marjane Satrapi conta a infância no Irã da revolução islâmica e a adolescência no exílio.",
  },
  {
    slug: "maus",
    title: "Maus",
    authors: ["Art Spiegelman"],
    search: { title: "Maus", author: "Art Spiegelman" },
    publishedYear: 1986,
    genres: ["quadrinhos", "historia", "biografia"],
    description:
      "Art Spiegelman entrevista o pai, sobrevivente de Auschwitz, e transforma a história em quadrinhos com judeus como ratos e nazistas como gatos.",
  },
  {
    slug: "mensagem",
    title: "Mensagem",
    authors: ["Fernando Pessoa"],
    search: { title: "Mensagem", author: "Fernando Pessoa" },
    publishedYear: 1934,
    genres: ["poesia"],
    description:
      "O único livro em português que Fernando Pessoa publicou em vida: poemas que releem a história de Portugal e do mar como mito.",
  },
  {
    slug: "alguma-poesia",
    title: "Alguma Poesia",
    authors: ["Carlos Drummond de Andrade"],
    search: { title: "Alguma poesia", author: "Carlos Drummond de Andrade" },
    cover: 12864352,
    publishedYear: 1930,
    genres: ["poesia", "literatura-brasileira"],
    description:
      "A estreia de Drummond, com o Poema de sete faces e a pedra no meio do caminho, marco do modernismo brasileiro.",
  },
  {
    slug: "uma-breve-historia-do-tempo",
    title: "Uma Breve História do Tempo",
    authors: ["Stephen Hawking"],
    search: { title: "A Brief History of Time", author: "Stephen Hawking" },
    publishedYear: 1988,
    genres: ["ciencia"],
    description:
      "Stephen Hawking explica, para quem não é físico, o Big Bang, os buracos negros e a natureza do tempo.",
  },
];

export const SEED_READERS: SeedReader[] = [
  {
    username: "ana",
    displayName: "Ana Souza",
    bio: "Machado no ônibus, Clarice antes de dormir.",
    genres: ["literatura-brasileira", "classicos", "contos"],
    joinedDaysAgo: 210,
    shelf: [
      {
        book: "dom-casmurro",
        status: "read",
        rating: 5,
        review:
          "Releio a cada cinco anos e a Capitu muda de culpa. Machado sabia o que estava fazendo.",
        daysAgo: 120,
      },
      {
        book: "memorias-postumas-de-bras-cubas",
        status: "read",
        rating: 4.5,
        daysAgo: 110,
      },
      {
        book: "a-hora-da-estrela",
        status: "read",
        rating: 5,
        review: "Curto e enorme. A Macabéa fica com a gente por semanas.",
        daysAgo: 95,
      },
      { book: "vidas-secas", status: "read", rating: 4, daysAgo: 80 },
      { book: "o-quinze", status: "read", rating: 4, daysAgo: 70 },
      {
        book: "quarto-de-despejo",
        status: "read",
        rating: 5,
        review: "Devia ser leitura obrigatória na escola. Dói e ensina.",
        daysAgo: 60,
      },
      {
        book: "capitaes-da-areia",
        status: "read",
        rating: 4.5,
        daysAgo: 50,
      },
      {
        book: "macunaima",
        status: "abandoned",
        review: "Parei na metade. Volto quando estiver com mais paciência.",
        daysAgo: 40,
      },
      {
        book: "grande-sertao-veredas",
        status: "reading",
        currentPage: 212,
        daysAgo: 20,
      },
      { book: "torto-arado", status: "want", daysAgo: 10 },
      { book: "a-paixao-segundo-gh", status: "want", daysAgo: 7 },
      { book: "iracema", status: "want", daysAgo: 3 },
    ],
  },
  {
    username: "bia",
    displayName: "Bia Lima",
    bio: "Fantasia de dia, ficção científica de madrugada.",
    genres: ["fantasia", "ficcao-cientifica", "distopia"],
    joinedDaysAgo: 200,
    shelf: [
      {
        book: "o-hobbit",
        status: "read",
        rating: 5,
        review: "O livro que me fez gostar de mapas.",
        daysAgo: 150,
      },
      {
        book: "a-sociedade-do-anel",
        status: "read",
        rating: 4.5,
        daysAgo: 130,
      },
      {
        book: "harry-potter-e-a-pedra-filosofal",
        status: "read",
        rating: 4,
        daysAgo: 125,
      },
      {
        book: "1984",
        status: "read",
        rating: 4.5,
        daysAgo: 100,
        copiedFrom: "caio",
      },
      { book: "fundacao", status: "read", rating: 4, daysAgo: 90 },
      {
        book: "ensaio-sobre-a-cegueira",
        status: "read",
        rating: 5,
        review: "Saramago sem ponto final e eu sem fôlego.",
        daysAgo: 85,
      },
      {
        book: "admiravel-mundo-novo",
        status: "read",
        rating: 3.5,
        daysAgo: 75,
      },
      { book: "frankenstein", status: "abandoned", daysAgo: 30 },
      { book: "duna", status: "reading", currentPage: 340, daysAgo: 15 },
      { book: "fahrenheit-451", status: "want", daysAgo: 12 },
      {
        book: "o-conto-da-aia",
        status: "want",
        daysAgo: 6,
        copiedFrom: "caio",
      },
    ],
  },
  {
    username: "caio",
    displayName: "Caio Andrade",
    bio: "Distopias e não ficção. Perfil fechado, mas aceito pedidos.",
    genres: ["distopia", "historia", "ciencia"],
    isPrivate: true,
    joinedDaysAgo: 240,
    shelf: [
      {
        book: "1984",
        status: "read",
        rating: 5,
        review: "Cada ano fica mais atual, e é isso que assusta.",
        daysAgo: 200,
      },
      {
        book: "admiravel-mundo-novo",
        status: "read",
        rating: 4.5,
        daysAgo: 190,
      },
      { book: "fahrenheit-451", status: "read", rating: 4, daysAgo: 185 },
      { book: "o-conto-da-aia", status: "read", rating: 4.5, daysAgo: 170 },
      {
        book: "a-revolucao-dos-bichos",
        status: "read",
        rating: 4,
        daysAgo: 160,
      },
      {
        book: "ensaio-sobre-a-cegueira",
        status: "read",
        rating: 4.5,
        daysAgo: 150,
      },
      {
        book: "sapiens",
        status: "read",
        rating: 4,
        review: "Ótimo para conversar no bar, raso para citar em prova.",
        daysAgo: 140,
      },
      {
        book: "uma-breve-historia-do-tempo",
        status: "reading",
        currentPage: 88,
        daysAgo: 25,
      },
      { book: "o-nome-da-rosa", status: "want", daysAgo: 9 },
    ],
  },
  {
    username: "duda",
    displayName: "Duda Rocha",
    bio: "Romances que doem e clássicos que ensinam.",
    genres: ["romance", "classicos", "realismo-magico"],
    joinedDaysAgo: 180,
    shelf: [
      {
        book: "orgulho-e-preconceito",
        status: "read",
        rating: 5,
        review: "Elizabeth Bennet é a amiga que eu queria ter.",
        daysAgo: 160,
      },
      { book: "dom-casmurro", status: "read", rating: 4, daysAgo: 140 },
      { book: "iracema", status: "read", rating: 3.5, daysAgo: 130 },
      {
        book: "cem-anos-de-solidao",
        status: "read",
        rating: 5,
        daysAgo: 110,
      },
      {
        book: "o-pequeno-principe",
        status: "read",
        rating: 4.5,
        daysAgo: 100,
      },
      {
        book: "o-alquimista",
        status: "abandoned",
        review: "Não era o momento. Ficou a frase do universo conspirando.",
        daysAgo: 90,
      },
      {
        book: "a-casa-dos-espiritos",
        status: "reading",
        currentPage: 150,
        daysAgo: 18,
      },
      { book: "crime-e-castigo", status: "want", daysAgo: 14 },
      { book: "capitaes-da-areia", status: "want", daysAgo: 5 },
    ],
  },
  {
    username: "enzo",
    displayName: "Enzo Martins",
    bio: "Se tem fantasma, eu leio.",
    genres: ["terror", "misterio", "classicos"],
    joinedDaysAgo: 170,
    shelf: [
      {
        book: "o-iluminado",
        status: "read",
        rating: 5,
        review: "Li de luz acesa e mesmo assim olhei o corredor duas vezes.",
        daysAgo: 120,
      },
      { book: "dracula", status: "read", rating: 4.5, daysAgo: 110 },
      { book: "frankenstein", status: "read", rating: 4.5, daysAgo: 105 },
      {
        book: "assassinato-no-expresso-do-oriente",
        status: "read",
        rating: 4,
        daysAgo: 90,
      },
      { book: "a-metamorfose", status: "read", rating: 4, daysAgo: 80 },
      { book: "crime-e-castigo", status: "read", rating: 5, daysAgo: 70 },
      {
        book: "o-nome-da-rosa",
        status: "reading",
        currentPage: 230,
        daysAgo: 11,
      },
      { book: "1984", status: "want", daysAgo: 8 },
    ],
  },
  {
    username: "flor",
    displayName: "Flor Nunes",
    bio: "Poesia no bolso e um conto por dia.",
    genres: ["poesia", "contos", "literatura-brasileira"],
    joinedDaysAgo: 160,
    shelf: [
      {
        book: "mensagem",
        status: "read",
        rating: 5,
        review: "Pessoa em pílulas: leio um poema por manhã.",
        daysAgo: 100,
      },
      { book: "alguma-poesia", status: "read", rating: 4.5, daysAgo: 95 },
      {
        book: "a-hora-da-estrela",
        status: "read",
        rating: 4.5,
        daysAgo: 90,
      },
      {
        book: "o-pequeno-principe",
        status: "read",
        rating: 5,
        daysAgo: 85,
      },
      { book: "vidas-secas", status: "read", rating: 4, daysAgo: 75 },
      {
        book: "torto-arado",
        status: "read",
        rating: 5,
        review: "A terra, as mulheres e uma língua cortada. Não esqueço.",
        daysAgo: 40,
      },
      { book: "a-metamorfose", status: "want", daysAgo: 13 },
      {
        book: "a-paixao-segundo-gh",
        status: "reading",
        currentPage: 60,
        daysAgo: 9,
      },
    ],
  },
  {
    username: "gael",
    displayName: "Gael Ribeiro",
    bio: "Quadrinhos, memórias e histórias que aconteceram de verdade.",
    genres: ["quadrinhos", "biografia", "historia"],
    joinedDaysAgo: 150,
    shelf: [
      {
        book: "maus",
        status: "read",
        rating: 5,
        review: "Um quadrinho que vale por uma aula inteira de história.",
        daysAgo: 130,
      },
      { book: "persepolis", status: "read", rating: 5, daysAgo: 120 },
      {
        book: "o-diario-de-anne-frank",
        status: "read",
        rating: 4.5,
        daysAgo: 110,
      },
      {
        book: "quarto-de-despejo",
        status: "read",
        rating: 4.5,
        daysAgo: 100,
      },
      { book: "o-hobbit", status: "read", rating: 4, daysAgo: 60 },
      {
        book: "dom-quixote",
        status: "abandoned",
        review: "Bonito, mas pesado demais para ler no ônibus.",
        daysAgo: 45,
      },
      { book: "sapiens", status: "reading", currentPage: 190, daysAgo: 16 },
      { book: "uma-breve-historia-do-tempo", status: "want", daysAgo: 7 },
    ],
  },
  {
    username: "helena",
    displayName: "Helena Prado",
    bio: "Realismo mágico e livros de mais de quinhentas páginas.",
    genres: ["realismo-magico", "ficcao", "classicos"],
    joinedDaysAgo: 230,
    shelf: [
      {
        book: "cem-anos-de-solidao",
        status: "read",
        rating: 5,
        review:
          "Precisei desenhar a árvore genealógica no caderno. Valeu cada página.",
        daysAgo: 180,
      },
      {
        book: "a-casa-dos-espiritos",
        status: "read",
        rating: 4.5,
        daysAgo: 160,
      },
      { book: "macunaima", status: "read", rating: 4, daysAgo: 150 },
      {
        book: "grande-sertao-veredas",
        status: "read",
        rating: 5,
        review: "Nonada. Começa com essa palavra e não acaba nunca.",
        daysAgo: 140,
      },
      { book: "o-cortico", status: "read", rating: 3.5, daysAgo: 120 },
      { book: "crime-e-castigo", status: "read", rating: 4.5, daysAgo: 100 },
      { book: "torto-arado", status: "read", rating: 5, daysAgo: 70 },
      {
        book: "dom-quixote",
        status: "reading",
        currentPage: 520,
        daysAgo: 30,
      },
      { book: "duna", status: "want", daysAgo: 4 },
    ],
  },
];

// Trechos curtos e conhecidos, nas traduções mais citadas em português
export const SEED_QUOTES: SeedQuote[] = [
  {
    reader: "ana",
    book: "dom-casmurro",
    text: "Olhos de cigana oblíqua e dissimulada.",
    daysAgo: 121,
  },
  {
    reader: "ana",
    book: "memorias-postumas-de-bras-cubas",
    text: "Não tive filhos, não transmiti a nenhuma criatura o legado da nossa miséria.",
    daysAgo: 111,
  },
  {
    reader: "ana",
    book: "a-hora-da-estrela",
    text: "Tudo no mundo começou com um sim.",
    daysAgo: 96,
  },
  {
    reader: "ana",
    book: "vidas-secas",
    text: "Você é um bicho, Fabiano.",
    daysAgo: 81,
  },
  {
    reader: "ana",
    book: "grande-sertao-veredas",
    text: "O real não está na saída nem na chegada: ele se dispõe para a gente é no meio da travessia.",
    daysAgo: 19,
  },
  {
    reader: "helena",
    book: "grande-sertao-veredas",
    text: "Viver é muito perigoso.",
    daysAgo: 141,
  },
  {
    reader: "helena",
    book: "cem-anos-de-solidao",
    text: "Muitos anos depois, diante do pelotão de fuzilamento, o coronel Aureliano Buendía havia de recordar aquela tarde remota em que seu pai o levou para conhecer o gelo.",
    daysAgo: 181,
  },
  {
    reader: "caio",
    book: "1984",
    text: "Guerra é paz. Liberdade é escravidão. Ignorância é força.",
    daysAgo: 201,
  },
  {
    reader: "caio",
    book: "a-revolucao-dos-bichos",
    text: "Todos os animais são iguais, mas alguns animais são mais iguais do que outros.",
    daysAgo: 161,
  },
  {
    reader: "bia",
    book: "o-hobbit",
    text: "Numa toca no chão vivia um hobbit.",
    daysAgo: 151,
  },
  {
    reader: "bia",
    book: "duna",
    text: "O medo é o assassino da mente.",
    daysAgo: 14,
  },
  {
    reader: "bia",
    book: "ensaio-sobre-a-cegueira",
    text: "Se podes olhar, vê. Se podes ver, repara.",
    daysAgo: 86,
  },
  {
    reader: "duda",
    book: "orgulho-e-preconceito",
    text: "É uma verdade universalmente reconhecida que um homem solteiro, possuidor de uma boa fortuna, deve estar necessitado de uma esposa.",
    daysAgo: 161,
  },
  {
    reader: "duda",
    book: "o-pequeno-principe",
    text: "Tu te tornas eternamente responsável por aquilo que cativas.",
    daysAgo: 101,
  },
  {
    reader: "duda",
    book: "iracema",
    text: "Verdes mares bravios de minha terra natal, onde canta a jandaia nas frondes da carnaúba.",
    daysAgo: 131,
  },
  {
    reader: "flor",
    book: "o-pequeno-principe",
    text: "Só se vê bem com o coração. O essencial é invisível aos olhos.",
    daysAgo: 86,
  },
  {
    reader: "flor",
    book: "mensagem",
    text: "Tudo vale a pena se a alma não é pequena.",
    daysAgo: 101,
  },
  {
    reader: "enzo",
    book: "a-metamorfose",
    text: "Quando certa manhã Gregor Samsa acordou de sonhos intranquilos, encontrou-se em sua cama metamorfoseado num inseto monstruoso.",
    daysAgo: 81,
  },
  {
    reader: "gael",
    book: "dom-quixote",
    text: "Num lugar da Mancha, de cujo nome não quero lembrar-me.",
    daysAgo: 46,
  },
];

export const SEED_FOLLOWS: SeedFollow[] = [
  { from: "ana", to: "bia", daysAgo: 190 },
  { from: "ana", to: "duda", daysAgo: 170 },
  { from: "ana", to: "flor", daysAgo: 150 },
  { from: "bia", to: "ana", daysAgo: 188 },
  { from: "bia", to: "caio", daysAgo: 180 },
  { from: "bia", to: "gael", daysAgo: 140 },
  { from: "bia", to: "enzo", daysAgo: 120 },
  { from: "caio", to: "bia", daysAgo: 179 },
  { from: "caio", to: "ana", daysAgo: 175 },
  { from: "duda", to: "ana", daysAgo: 165 },
  { from: "duda", to: "helena", daysAgo: 160 },
  { from: "duda", to: "enzo", daysAgo: 100 },
  { from: "enzo", to: "duda", daysAgo: 99 },
  { from: "enzo", to: "bia", daysAgo: 95 },
  { from: "flor", to: "ana", daysAgo: 155 },
  { from: "flor", to: "duda", daysAgo: 130 },
  { from: "flor", to: "helena", daysAgo: 125 },
  { from: "gael", to: "bia", daysAgo: 145 },
  { from: "gael", to: "enzo", daysAgo: 90 },
  { from: "gael", to: "caio", daysAgo: 2, pending: true },
  { from: "helena", to: "duda", daysAgo: 158 },
  { from: "helena", to: "ana", daysAgo: 150 },
  { from: "helena", to: "flor", daysAgo: 120 },
];

export const SEED_COLLECTIONS: SeedCollection[] = [
  {
    slug: "classicos-brasileiros",
    owner: "ana",
    title: "Clássicos brasileiros",
    emoji: "📚",
    description:
      "Os livros que explicam o Brasil, de Machado a Carolina Maria de Jesus.",
    visibility: "public",
    collaborative: true,
    members: ["bia"],
    daysAgo: 115,
    books: [
      {
        slug: "dom-casmurro",
        note: "Capitu traiu ou não traiu? Cada releitura muda a resposta.",
      },
      { slug: "memorias-postumas-de-bras-cubas" },
      {
        slug: "grande-sertao-veredas",
        note: "Para ler em voz alta, devagar.",
      },
      { slug: "vidas-secas" },
      { slug: "a-hora-da-estrela" },
      {
        slug: "quarto-de-despejo",
        note: "O diário que todo mundo devia ler na escola.",
      },
      { slug: "torto-arado", addedBy: "bia" },
      { slug: "a-paixao-segundo-gh", addedBy: "bia" },
    ],
    likes: ["bia", "duda", "flor", "helena", "gael", "enzo", "caio"],
    saves: ["duda", "flor"],
  },
  {
    slug: "para-ler-devagar",
    owner: "ana",
    title: "Para ler devagar",
    emoji: "🍵",
    visibility: "private",
    daysAgo: 30,
    books: [
      { slug: "grande-sertao-veredas" },
      { slug: "a-paixao-segundo-gh" },
      { slug: "iracema" },
    ],
  },
  {
    slug: "distopias",
    owner: "caio",
    title: "Distopias",
    emoji: "🔦",
    description: "Os futuros que a gente tenta evitar.",
    visibility: "public",
    daysAgo: 165,
    books: [
      { slug: "1984", note: "O primeiro, e ainda o mais assustador." },
      { slug: "admiravel-mundo-novo" },
      { slug: "fahrenheit-451" },
      { slug: "o-conto-da-aia" },
      { slug: "ensaio-sobre-a-cegueira" },
      { slug: "a-revolucao-dos-bichos" },
    ],
    likes: ["bia"],
  },
  {
    slug: "futuros-que-dao-medo",
    owner: "bia",
    title: "Futuros que dão medo",
    emoji: "🌒",
    description: "Distopias para ler com a luz acesa.",
    visibility: "public",
    copiedFrom: "distopias",
    daysAgo: 98,
    books: [
      { slug: "1984" },
      { slug: "ensaio-sobre-a-cegueira" },
      { slug: "duna" },
    ],
    likes: ["enzo", "duda", "helena", "gael"],
    saves: ["enzo"],
  },
  {
    slug: "fantasia-para-comecar",
    owner: "bia",
    title: "Fantasia para começar",
    emoji: "🐉",
    description: "Portas de entrada para mundos inteiros.",
    visibility: "public",
    daysAgo: 120,
    books: [
      { slug: "o-hobbit", note: "Comece por aqui. Sério." },
      { slug: "a-sociedade-do-anel" },
      { slug: "harry-potter-e-a-pedra-filosofal" },
      { slug: "duna" },
      { slug: "fundacao" },
    ],
    likes: ["gael", "enzo", "ana"],
  },
  {
    slug: "luz-acesa",
    owner: "enzo",
    title: "Para ler de luz acesa",
    emoji: "🕯️",
    description: "Clássicos do medo e alguns mistérios.",
    visibility: "public",
    daysAgo: 88,
    books: [
      { slug: "o-iluminado" },
      { slug: "dracula" },
      { slug: "frankenstein" },
      { slug: "assassinato-no-expresso-do-oriente" },
      { slug: "o-nome-da-rosa" },
    ],
    likes: ["bia", "duda"],
  },
  {
    slug: "curtos-e-certeiros",
    owner: "flor",
    title: "Curtos e certeiros",
    emoji: "✂️",
    description: "Menos de duzentas páginas que ficam anos na cabeça.",
    visibility: "public",
    daysAgo: 70,
    books: [
      { slug: "a-hora-da-estrela" },
      { slug: "o-pequeno-principe" },
      { slug: "a-metamorfose" },
      { slug: "vidas-secas" },
      { slug: "o-quinze" },
      { slug: "mensagem" },
    ],
    likes: ["ana", "helena", "duda", "gael"],
    saves: ["ana"],
  },
  {
    slug: "historias-que-aconteceram",
    owner: "gael",
    title: "Histórias que aconteceram",
    emoji: "🗞️",
    description: "Memórias, diários e quadrinhos que não são ficção.",
    visibility: "public",
    daysAgo: 95,
    books: [
      { slug: "maus" },
      { slug: "persepolis" },
      { slug: "o-diario-de-anne-frank" },
      { slug: "quarto-de-despejo" },
      { slug: "sapiens" },
    ],
    likes: ["ana", "caio", "flor"],
  },
  {
    slug: "realismo-magico",
    owner: "helena",
    title: "Realismo mágico",
    emoji: "✨",
    description: "Quando o impossível é só mais um dia comum.",
    visibility: "public",
    daysAgo: 135,
    books: [
      { slug: "cem-anos-de-solidao" },
      { slug: "a-casa-dos-espiritos" },
      { slug: "macunaima" },
      { slug: "torto-arado" },
    ],
    likes: ["duda", "flor"],
  },
  {
    slug: "amores-impossiveis",
    owner: "duda",
    title: "Amores impossíveis",
    emoji: "💔",
    visibility: "public",
    daysAgo: 105,
    books: [
      { slug: "orgulho-e-preconceito" },
      { slug: "dom-casmurro" },
      { slug: "iracema" },
      { slug: "cem-anos-de-solidao" },
    ],
    likes: ["helena"],
  },
];
