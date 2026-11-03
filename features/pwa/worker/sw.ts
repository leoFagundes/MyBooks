// O service worker do MyBooks (MELHORIAS 9.1). O scripts/gerar-sw.mjs o
// empacota e põe a lista do precache no fim do build, em public/sw.js.
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  type PrecacheEntry,
  Serwist,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_PAGE = "/sem-conexao";
const MONTH = 30 * 24 * 60 * 60;

const serwist = new Serwist({
  // A página offline, os estilos, as fontes e os ícones
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Os arquivos do build têm o hash no nome e nunca mudam
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "build",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 300,
            maxAgeSeconds: MONTH,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      // As páginas têm a sessão de quem vê: sempre da rede, nunca do cache
      // (num aparelho dividido, a conta de um não aparece para o outro)
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_PAGE,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
