"use client";

import { useState } from "react";
import { ThemeSelect } from "@/components/shell/theme-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoRow } from "./dev-section";

const readingStatuses = [
  { value: "todos", label: "Todos" },
  { value: "lido", label: "Lido" },
  { value: "lendo", label: "Lendo" },
  { value: "quero", label: "Quero ler" },
  { value: "abandonado", label: "Abandonado" },
] as const;

type ReadingStatus = (typeof readingStatuses)[number]["value"];

export function NavigationDemo() {
  const [status, setStatus] = useState<ReadingStatus>("todos");
  const current = readingStatuses.find((option) => option.value === status);

  return (
    <>
      <DemoRow label="Abas">
        <Tabs defaultValue="estante" className="w-full">
          <TabsList aria-label="Seções do perfil">
            <TabsTrigger value="estante">Estante</TabsTrigger>
            <TabsTrigger value="colecoes">Coleções</TabsTrigger>
            <TabsTrigger value="citacoes">Citações</TabsTrigger>
          </TabsList>
          <TabsContent value="estante">
            <p className="text-sm text-muted-foreground">
              128 livros, de Machado de Assis a Ursula K. Le Guin.
            </p>
          </TabsContent>
          <TabsContent value="colecoes">
            <p className="text-sm text-muted-foreground">
              6 coleções, entre elas “Para ler numa tarde de chuva”.
            </p>
          </TabsContent>
          <TabsContent value="citacoes">
            <p className="font-serif text-lg leading-snug">
              “Viver é muito perigoso.”{" "}
              <span className="font-mono text-xs text-muted-foreground">
                p. 26
              </span>
            </p>
          </TabsContent>
        </Tabs>
      </DemoRow>

      <DemoRow label="Controle segmentado">
        <SegmentedControl
          aria-label="Status de leitura"
          value={status}
          onValueChange={setStatus}
          options={readingStatuses}
        />
        <span
          className="font-mono text-xs text-muted-foreground"
          aria-live="polite"
        >
          mostrando: {current?.label.toLowerCase()}
        </span>
      </DemoRow>

      <DemoRow label="Tema">
        <ThemeSelect />
      </DemoRow>
    </>
  );
}
