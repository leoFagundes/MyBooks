"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format";

export type CommunityTab = {
  value: string;
  label: string;
  count: number;
  content: React.ReactNode;
};

/**
 * A comunidade do livro em abas (Resenhas, Discussões, Coleções), no lugar
 * de uma seção embaixo da outra: no celular, a página ficava longa. Abre na
 * primeira aba que tem conteúdo; o indicador desliza entre elas.
 */
export function CommunityTabs({ tabs }: { tabs: CommunityTab[] }) {
  const first = tabs.find((tab) => tab.count > 0) ?? tabs[0];
  return (
    <Tabs defaultValue={first?.value}>
      <TabsList aria-label="A comunidade do livro" className="gap-5 sm:gap-6">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            {tab.count > 0 ? (
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatNumber(tab.count)}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
