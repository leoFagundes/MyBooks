"use client";

import { motion, stagger, useReducedMotion } from "motion/react";
import {
  entranceTransition,
  entranceVariants,
  staggerDelay,
  tweens,
} from "@/lib/motion";
import { splitWords } from "./split-words";

type TextRevealProps = {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
};

const tags = { h1: motion.h1, h2: motion.h2, p: motion.p };

/** Título revelado palavra por palavra, saindo do desfoque (spec §3, momento 8). */
export function TextReveal({ text, as = "h1", className }: TextRevealProps) {
  const reduced = useReducedMotion() ?? false;
  const Tag = tags[as];
  const words = splitWords(text);

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: stagger(staggerDelay) } },
      }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <motion.span
            className="inline-block"
            variants={entranceVariants}
            transition={entranceTransition(reduced, tweens.slow)}
          >
            {word}
          </motion.span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
