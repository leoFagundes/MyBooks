// As configurações do site (tabela site_settings): o aviso no topo, o modo
// manutenção e as funcionalidades liga/desliga. Valor que não bate com o
// formato vira o padrão: o site nunca quebra por uma linha estranha.

export const FEATURE_FLAGS = [
  {
    key: "cadastro",
    label: "Cadastro de contas novas",
    description: "Desligado, a página de cadastro avisa que está fechada.",
  },
  {
    key: "criar_generos",
    label: "Criar gêneros",
    description: "Leitores sugerem gêneros novos no perfil.",
  },
  {
    key: "importar_goodreads",
    label: "Importar do Goodreads",
    description: "A importação nas configurações da conta.",
  },
  {
    key: "visualizador_3d",
    label: "Visualizador 3D",
    description: 'O "Ver em 3D" na página do livro.',
  },
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number]["key"];
export type BannerTone = "info" | "aviso";

export type SiteSettings = {
  banner: { enabled: boolean; message: string; tone: BannerTone };
  maintenance: { enabled: boolean; message: string };
  features: Record<FeatureFlag, boolean>;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  banner: { enabled: false, message: "", tone: "info" },
  maintenance: { enabled: false, message: "" },
  features: {
    cadastro: true,
    criar_generos: true,
    importar_goodreads: true,
    visualizador_3d: true,
  },
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

/** As linhas de site_settings no formato do app, com o padrão onde faltar. */
export function parseSettings(
  rows: readonly { key: string; value: unknown }[],
): SiteSettings {
  const byKey = new Map(rows.map((row) => [row.key, record(row.value)]));
  const banner = byKey.get("banner") ?? {};
  const maintenance = byKey.get("maintenance") ?? {};
  const features = byKey.get("features") ?? {};
  return {
    banner: {
      enabled: banner.enabled === true,
      message: text(banner.message, ""),
      tone: banner.tone === "aviso" ? "aviso" : "info",
    },
    maintenance: {
      enabled: maintenance.enabled === true,
      message: text(maintenance.message, ""),
    },
    features: Object.fromEntries(
      FEATURE_FLAGS.map(({ key }) => [key, features[key] !== false]),
    ) as Record<FeatureFlag, boolean>,
  };
}
