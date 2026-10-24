"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { SwapText } from "@/components/motion/swap-text";
import { TextReveal } from "@/components/motion/text-reveal";
import { Button } from "@/components/ui/button";
import { springs } from "@/lib/motion";
import { DemoRow } from "./dev-section";

const books = [
  { title: "Dom Casmurro", author: "Machado de Assis" },
  { title: "A Hora da Estrela", author: "Clarice Lispector" },
  { title: "Torto Arado", author: "Itamar Vieira Junior" },
  { title: "Grande Sertão: Veredas", author: "Guimarães Rosa" },
  { title: "Ensaio sobre a Cegueira", author: "José Saramago" },
  { title: "Cem Anos de Solidão", author: "Gabriel García Márquez" },
];

function Replay({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <RotateCcw />
      Repetir
    </Button>
  );
}

export function MotionDemo() {
  const [entryKey, setEntryKey] = useState(0);
  const [titleKey, setTitleKey] = useState(0);
  const [following, setFollowing] = useState(false);
  const [springsOn, setSpringsOn] = useState(false);
  const [bookCount, setBookCount] = useState(128);

  return (
    <>
      <DemoRow label="Entradas em sequência">
        <Replay onClick={() => setEntryKey((key) => key + 1)} />
      </DemoRow>
      <Stagger
        key={`entradas-${entryKey}`}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {books.map((book, index) => (
          <StaggerItem
            key={book.title}
            data-testid={`entrada-${index + 1}`}
            className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4"
          >
            <span className="font-serif text-lg leading-tight">
              {book.title}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {book.author}
            </span>
          </StaggerItem>
        ))}
      </Stagger>

      <DemoRow label="Título palavra por palavra">
        <Replay onClick={() => setTitleKey((key) => key + 1)} />
      </DemoRow>
      <TextReveal
        key={`titulo-${titleKey}`}
        as="p"
        text="Sua vida de leitor, em uma estante só."
        className="font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl"
      />

      <DemoRow label="Texto que muda">
        <Button
          layout
          variant={following ? "outline" : "primary"}
          onClick={() => setFollowing((value) => !value)}
          aria-pressed={following}
        >
          <SwapText text={following ? "Seguindo" : "Seguir"} />
        </Button>
      </DemoRow>

      <DemoRow label="Números">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBookCount((count) => count + 1)}
        >
          <Plus />
          Somar um livro
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={bookCount === 0}
          onClick={() => setBookCount((count) => Math.max(0, count - 1))}
        >
          <Minus />
          Tirar um livro
        </Button>
      </DemoRow>
      <p className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-sm text-muted-foreground">
        <span data-testid="contador-livros">
          <AnimatedNumber value={bookCount} className="text-foreground" />{" "}
          livros
        </span>
        <span aria-hidden>·</span>
        <span>
          <AnimatedNumber value={12} className="text-foreground" /> coleções
        </span>
        <span aria-hidden>·</span>
        <span>
          <AnimatedNumber value={1204} className="text-foreground" /> seguidores
        </span>
        <span aria-hidden>·</span>
        <span>
          <AnimatedNumber value={87} className="text-foreground" /> seguindo
        </span>
      </p>

      <DemoRow label="Molas">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSpringsOn((value) => !value)}
        >
          {springsOn ? "Voltar" : "Soltar as molas"}
        </Button>
      </DemoRow>
      <div className="flex flex-col gap-3">
        {(Object.keys(springs) as (keyof typeof springs)[]).map((name) => (
          <div key={name} className="flex items-center gap-4">
            <span className="w-16 font-mono text-xs text-muted-foreground">
              {name}
            </span>
            {/* Trilha de 224px: a bolinha (24px, 4px de margem) anda 192px */}
            <div className="relative h-8 w-56 shrink-0 rounded-control border border-border bg-surface">
              <motion.span
                className="absolute top-1 left-1 size-6 rounded-[7px] bg-foreground"
                animate={{ x: springsOn ? 190 : 0 }}
                transition={springs[name]}
              />
            </div>
            <span className="hidden w-48 font-mono text-[11px] text-muted-foreground sm:block">
              bounce {springs[name].bounce} · {springs[name].visualDuration}s
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
