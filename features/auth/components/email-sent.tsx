"use client";

import { MailCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { entranceTransition, entranceVariants, tweens } from "@/lib/motion";

/** Depois de pedir o link: para onde ele foi e como seguir. */
export function EmailSent({
  email,
  children,
  onReset,
}: {
  email: string;
  children: React.ReactNode;
  onReset: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      variants={entranceVariants}
      initial="hidden"
      animate="visible"
      transition={entranceTransition(reduced, tweens.slow)}
      className="flex flex-col items-start gap-4"
      role="status"
    >
      <MailCheck className="size-6 text-muted-foreground" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <h2 className="font-serif text-2xl leading-tight">
          Confira seu e-mail
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Enviamos um link para{" "}
          <span className="font-medium break-all text-foreground">{email}</span>
          . {children}
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onReset}>
        Usar outro e-mail
      </Button>
    </motion.div>
  );
}
