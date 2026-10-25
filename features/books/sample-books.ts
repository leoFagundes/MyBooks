import type { BookVisual } from "./types";

// Livros reais para a vitrine do /dev, buscados uma vez na Open Library.
// As cores de capa saíram do node-vibrant (é o que a Fase 3 faz ao salvar
// um livro). "A Paixão Segundo G.H." não tem capa e "Quarto de Despejo" tem
// uma capa que não carrega, para mostrar a capa tipográfica nos dois casos.
export const sampleBooks: BookVisual[] = [
  {
    id: "dom-casmurro",
    title: "Dom Casmurro",
    authors: ["Machado de Assis"],
    coverUrl: "https://covers.openlibrary.org/b/id/647501-L.jpg",
    coverColor: "#ecc404",
    pageCount: 268,
    publishedYear: 1899,
  },
  {
    id: "a-hora-da-estrela",
    title: "A Hora da Estrela",
    authors: ["Clarice Lispector"],
    coverUrl: "https://covers.openlibrary.org/b/id/650866-L.jpg",
    coverColor: "#43443e",
    pageCount: 96,
    publishedYear: 1977,
  },
  {
    id: "torto-arado",
    title: "Torto Arado",
    authors: ["Itamar Vieira Junior"],
    coverUrl: "https://covers.openlibrary.org/b/id/12369648-L.jpg",
    coverColor: "#f9bca4",
    pageCount: 280,
    publishedYear: 2019,
  },
  {
    id: "grande-sertao-veredas",
    title: "Grande Sertão: Veredas",
    authors: ["João Guimarães Rosa"],
    coverUrl: "https://covers.openlibrary.org/b/id/13909068-L.jpg",
    coverColor: "#54563c",
    pageCount: 504,
    publishedYear: 1956,
  },
  {
    id: "1984",
    title: "1984",
    authors: ["George Orwell"],
    coverUrl: "https://covers.openlibrary.org/b/id/9267242-L.jpg",
    coverColor: "#8c8476",
    pageCount: 318,
    publishedYear: 1949,
  },
  {
    id: "duna",
    title: "Duna",
    authors: ["Frank Herbert"],
    coverUrl: "https://covers.openlibrary.org/b/id/11481354-L.jpg",
    coverColor: "#695e1b",
    pageCount: 608,
    publishedYear: 1965,
  },
  {
    id: "o-hobbit",
    title: "O Hobbit",
    authors: ["J. R. R. Tolkien"],
    coverUrl: "https://covers.openlibrary.org/b/id/14627509-L.jpg",
    coverColor: "#5c4733",
    pageCount: 310,
    publishedYear: 1937,
  },
  {
    id: "cem-anos-de-solidao",
    title: "Cem Anos de Solidão",
    authors: ["Gabriel García Márquez"],
    coverUrl: "https://covers.openlibrary.org/b/id/12627383-L.jpg",
    coverColor: "#b51a4b",
    pageCount: 432,
    publishedYear: 1967,
  },
  {
    id: "ensaio-sobre-a-cegueira",
    title: "Ensaio sobre a Cegueira",
    authors: ["José Saramago"],
    coverUrl: "https://covers.openlibrary.org/b/id/10482411-L.jpg",
    coverColor: "#efeeea",
    pageCount: 352,
    publishedYear: 1995,
  },
  {
    id: "sapiens",
    title: "Sapiens",
    authors: ["Yuval Noah Harari"],
    coverUrl: "https://covers.openlibrary.org/b/id/8634250-L.jpg",
    coverColor: "#dc542f",
    pageCount: 456,
    publishedYear: 2011,
  },
  {
    id: "memorias-postumas-de-bras-cubas",
    title: "Memórias Póstumas de Brás Cubas",
    authors: ["Machado de Assis"],
    coverUrl: "https://covers.openlibrary.org/b/id/123152-L.jpg",
    coverColor: "#504c46",
    pageCount: 242,
    publishedYear: 1881,
  },
  {
    id: "vidas-secas",
    title: "Vidas Secas",
    authors: ["Graciliano Ramos"],
    coverUrl: "https://covers.openlibrary.org/b/id/12369687-L.jpg",
    coverColor: "#b48953",
    pageCount: 155,
    publishedYear: 1938,
  },
  {
    id: "o-pequeno-principe",
    title: "O Pequeno Príncipe",
    authors: ["Antoine de Saint-Exupéry"],
    coverUrl: "https://covers.openlibrary.org/b/id/10708272-L.jpg",
    coverColor: "#a59475",
    pageCount: 96,
    publishedYear: 1943,
  },
  {
    id: "a-paixao-segundo-gh",
    title: "A Paixão Segundo G.H.",
    authors: ["Clarice Lispector"],
    coverUrl: null,
    coverColor: null,
    pageCount: 176,
    publishedYear: 1964,
  },
  {
    id: "quarto-de-despejo",
    title: "Quarto de Despejo",
    authors: ["Carolina Maria de Jesus"],
    coverUrl: "/capas/nao-existe.jpg",
    coverColor: null,
    pageCount: 200,
    publishedYear: 1960,
  },
];

// Sinopses curtas em pt-BR para a página de demonstração do livro (/dev).
export const sampleDescriptions: Record<string, string> = {
  "dom-casmurro":
    "Bento Santiago, o Bentinho, já velho e recolhido, decide contar a própria história para atar as duas pontas da vida. Relembra a infância na rua de Matacavalos, o amor por Capitu, a vizinha de olhos de ressaca, e o casamento que parecia feliz até que uma dúvida passa a consumi-lo: teria ela o traído com Escobar, seu melhor amigo?",
  "a-hora-da-estrela":
    "O narrador Rodrigo S.M. conta a vida de Macabéa, uma moça alagoana que vive no Rio de Janeiro, trabalha como datilógrafa e mal sabe que existe. Entre o namoro com Olímpico e a visita a uma cartomante, Clarice escreve sobre a pobreza, a solidão e o próprio ato de escrever.",
  "torto-arado":
    "No sertão baiano da Chapada Diamantina, as irmãs Bibiana e Belonísia, filhas de trabalhadores de uma fazenda, têm a vida unida para sempre por um acidente na infância. Narrado em três vozes, o romance acompanha as famílias que trabalham uma terra que não é delas e a luta pelo direito de ficar.",
  "grande-sertao-veredas":
    "Riobaldo, ex-jagunço que virou fazendeiro, conta a um visitante da cidade a sua travessia pelo sertão de Minas Gerais. Entre as guerras dos bandos de jagunços, a vingança contra Hermógenes e o amor calado por Diadorim, ele volta sempre à mesma pergunta: fez ou não fez um pacto com o diabo nas Veredas Mortas?",
  "1984":
    "Na Oceânia, um Estado que vigia cada gesto sob o olhar do Grande Irmão, Winston Smith trabalha no Ministério da Verdade reescrevendo o passado para que ele concorde com o Partido. Quando começa a escrever um diário e se apaixona por Julia, descobre o preço de pensar por conta própria.",
  duna: "No planeta desértico Arrakis, única fonte da especiaria mais valiosa do universo, o jovem Paul Atreides vê a família ser traída pelos Harkonnen. Refugiado no deserto entre os fremen, ele passa a ser visto como o messias que aquele povo esperava.",
  "o-hobbit":
    "Bilbo Bolseiro, um hobbit que gosta do conforto da sua toca, é convencido pelo mago Gandalf a acompanhar treze anões numa jornada para recuperar o tesouro tomado pelo dragão Smaug. No caminho, encontra trolls, elfos, aranhas gigantes e um anel que muda tudo.",
  "cem-anos-de-solidao":
    "A história da família Buendía ao longo de sete gerações em Macondo, a cidade fundada por José Arcadio Buendía no meio do pântano. Guerras civis, amores proibidos, a chegada do trem e da companhia bananeira se misturam a acontecimentos mágicos narrados como se fossem comuns.",
  "ensaio-sobre-a-cegueira":
    "Um homem fica cego de repente, parado num semáforo, e a cegueira branca se espalha pela cidade. Os primeiros doentes são isolados num manicômio, onde a única pessoa que ainda enxerga, a mulher do médico, testemunha até onde podem chegar a crueldade e a solidariedade.",
  sapiens:
    "Yuval Noah Harari conta a história da humanidade em quatro grandes viradas: a Revolução Cognitiva, a Agrícola, a unificação da humanidade e a Científica. O livro pergunta como uma espécie de primatas sem importância passou a dominar o planeta, e se isso nos tornou mais felizes.",
  "memorias-postumas-de-bras-cubas":
    "Já morto, Brás Cubas decide escrever as próprias memórias e dedica o livro ao verme que primeiro roeu as frias carnes do seu cadáver. Com ironia e nenhuma pressa, repassa uma vida de privilégios, o amor por Virgília e as pequenas vaidades de quem nunca precisou trabalhar.",
  "vidas-secas":
    "Fugindo da seca, Fabiano, sinhá Vitória, os dois meninos e a cachorra Baleia atravessam o sertão nordestino até uma fazenda abandonada. Em capítulos que quase se leem sozinhos, Graciliano Ramos mostra uma família que mal consegue pôr em palavras o que sofre.",
  "o-pequeno-principe":
    "Um aviador cai no deserto do Saara e encontra um menino vindo de um asteroide minúsculo, onde deixou uma rosa. O pequeno príncipe conta suas viagens por planetas habitados por adultos estranhos e o que aprendeu com uma raposa sobre cativar e ser responsável.",
  "a-paixao-segundo-gh":
    "G.H., uma escultora que vive bem num apartamento de cobertura no Rio, entra no quarto da empregada que acabou de ir embora e encontra uma barata. O encontro desmonta tudo o que ela sabia sobre si mesma, num dos romances mais radicais da literatura brasileira.",
  "quarto-de-despejo":
    "O diário de Carolina Maria de Jesus, catadora de papel e mãe de três filhos, na favela do Canindé, em São Paulo, no fim dos anos 1950. Escrito em cadernos encontrados no lixo, o livro registra a fome, o trabalho e a lucidez de quem chamava a favela de quarto de despejo da cidade.",
};
