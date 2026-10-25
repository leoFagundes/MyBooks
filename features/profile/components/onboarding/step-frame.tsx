"use client";

import { useEffect, useRef } from "react";

type StepFrameProps = {
  title: string;
  description: string;
  /** Ao chegar num passo novo, o foco vai para o título (teclado e leitor de tela). */
  focusTitle: boolean;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function StepFrame({
  title,
  description,
  focusTitle,
  children,
  footer,
}: StepFrameProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
        >
          {title}
        </h1>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </header>
      {children}
      <footer className="flex items-center justify-between gap-3 border-t border-border pt-5">
        {footer}
      </footer>
    </div>
  );
}
