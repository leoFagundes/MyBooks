import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// O Supabase do projeto (banco, auth, arquivos e o tempo real)
const supabase = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://exemplo.supabase.co",
).host;

// Sem nonce: ele obrigaria toda página a renderizar a cada pedido (adeus
// cache e shell estático). O 'unsafe-inline' cobre os scripts do Next e o do
// tema; o que protege é a lista fechada de origens para imagens, conexões e
// scripts, e o site não poder ser embutido em outro
const csp = [
  "default-src 'self'",
  // O Analytics e o Speed Insights da Vercel: do próprio domínio na Vercel,
  // da va.vercel-scripts.com fora dela (o dev)
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  [
    "img-src 'self' data: blob:",
    `https://${supabase}`,
    // As capas da Open Library passam por dois redirecionamentos no archive.org
    "https://covers.openlibrary.org https://archive.org https://*.archive.org",
    // Fotos de quem entra com o Google e capas do Google Books
    "https://*.googleusercontent.com https://books.google.com",
  ].join(" "),
  "font-src 'self' data:",
  `connect-src 'self' https://${supabase} wss://${supabase}${isDev ? " ws:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Para navegadores antigos, que não leem o frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Câmera (o leitor de ISBN) e o sensor de inclinação (o 3D), só daqui
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), accelerometer=(self), gyroscope=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Não anuncia o framework no X-Powered-By
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    // A imagem da capa enviada no cadastro chega reduzida pelo navegador
    // (lado maior de 1200px), bem abaixo disso; o servidor recusa acima de 2 MB
    serverActions: { bodySizeLimit: "3mb" },
  },
  headers() {
    return Promise.resolve([
      // Os cabeçalhos de segurança em toda resposta
      { source: "/:path*", headers: securityHeaders },
      // O service worker nunca fica em cache: a versão nova chega na hora (a
      // regra de baixo vence a de cima na mesma chave)
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]);
  },
  // O perfil tem URL pública /@usuario, servida por app/(app)/u/[username]
  rewrites() {
    return [
      { source: "/@:username", destination: "/u/:username" },
      { source: "/@:username/:path*", destination: "/u/:username/:path*" },
    ];
  },
  // Loader próprio: as capas não passam pelo otimizador da Vercel (cota do
  // plano Hobby). Ver lib/image-loader.ts.
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
