"use client";

import { motion, useReducedMotion } from "motion/react";
import { createContext, use, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookCover } from "@/features/books/components/book-cover";
import type { BookVisual } from "@/features/books/types";
import { durations, springs, tweens } from "@/lib/motion";

type Flight = { id: number; book: BookVisual; from: DOMRect; to: DOMRect };

type ShelfFlight = {
  /** O clone da capa sai de `from` e voa até "Minha estante" (spec §3, momento 6). */
  fly: (from: Element, book: BookVisual) => void;
  /** Mostra por um instante o novo total da estante, girando de n−1 para n. */
  showCount: (count: number) => void;
};

/** O que o "Minha estante" da barra desenha depois de uma cópia. */
export type ShelfSignal = {
  /** Muda quando um clone chega: o link dá um pulinho. */
  bump: number;
  /** O número da estante, enquanto aparece; null quando escondido. */
  count: number | null;
};

const FlightContext = createContext<ShelfFlight | null>(null);
const SignalContext = createContext<ShelfSignal>({ bump: 0, count: null });

const COUNT_VISIBLE_MS = 2400;
// O número entra com n−1 e gira depois que o selo já apareceu
const COUNT_SPIN_DELAY_MS = 200;

// O alvo visível: o link da barra no desktop, o da pílula no celular
function visibleTarget(): DOMRect | null {
  for (const element of document.querySelectorAll("[data-shelf-target]")) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

export function ShelfFlightProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const [flights, setFlights] = useState<Flight[]>([]);
  const [signal, setSignal] = useState<ShelfSignal>({ bump: 0, count: null });
  const nextFlight = useRef(0);
  const countTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function fly(from: Element, book: BookVisual) {
    const to = visibleTarget();
    // Com movimento reduzido não há voo nem pulinho: só o número
    if (!to || reduced) return;
    const id = nextFlight.current++;
    setFlights((current) => [
      ...current,
      { id, book, from: from.getBoundingClientRect(), to },
    ]);
    // O clone some no fim da curva de 400ms; a mola de x ainda assenta
    // depois, invisível, e o pulinho não espera por ela
    setTimeout(() => {
      setFlights((current) => current.filter((flight) => flight.id !== id));
      setSignal((current) => ({ ...current, bump: current.bump + 1 }));
    }, durations.slow * 1000);
  }

  function showCount(count: number) {
    for (const timer of countTimers.current) clearTimeout(timer);
    setSignal((current) => ({ ...current, count: Math.max(0, count - 1) }));
    countTimers.current = [
      setTimeout(
        () => setSignal((current) => ({ ...current, count })),
        COUNT_SPIN_DELAY_MS,
      ),
      setTimeout(
        () => setSignal((current) => ({ ...current, count: null })),
        COUNT_VISIBLE_MS,
      ),
    ];
  }

  return (
    <FlightContext value={{ fly, showCount }}>
      <SignalContext value={signal}>{children}</SignalContext>
      {flights.length > 0
        ? createPortal(
            flights.map((flight) => (
              <FlyingCover key={flight.id} flight={flight} />
            )),
            document.body,
          )
        : null}
    </FlightContext>
  );
}

/**
 * O clone, fixo na tela e sem receber cliques. x e y andam com molas
 * diferentes (smooth e snappy): a diferença de ritmo desenha a curva.
 */
function FlyingCover({ flight }: { flight: Flight }) {
  const { from, to, book } = flight;
  const x = to.left + to.width / 2 - (from.left + from.width / 2);
  const y = to.top + to.height / 2 - (from.top + from.height / 2);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-60"
      style={{ left: from.left, top: from.top, width: from.width }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{ x, y, scale: 0.2, opacity: [1, 1, 0] }}
      transition={{
        x: springs.smooth,
        y: springs.snappy,
        scale: tweens.slow,
        opacity: { ...tweens.slow, times: [0, 0.66, 1] },
      }}
    >
      <BookCover book={book} size="fill" tilt={false} />
    </motion.div>
  );
}

export function useShelfFlight() {
  const context = use(FlightContext);
  if (!context)
    throw new Error("useShelfFlight precisa do <ShelfFlightProvider>");
  return context;
}

export function useShelfSignal() {
  return use(SignalContext);
}
