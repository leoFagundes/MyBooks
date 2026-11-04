import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    // A imagem da capa enviada no cadastro chega reduzida pelo navegador
    // (lado maior de 1200px), bem abaixo disso; o servidor recusa acima de 2 MB
    serverActions: { bodySizeLimit: "3mb" },
  },
  // O service worker nunca fica em cache: a versão nova chega na hora
  headers() {
    return Promise.resolve([
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
