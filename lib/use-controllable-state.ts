"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Options<T> = {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
};

/** Estado que funciona controlado (value + onChange) ou não controlado. */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: Options<T>) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const setValue = (next: T) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  return [current, setValue] as const;
}

/**
 * Fecha um overlay quando a rota fica escondida pelo Activity do Next (ou
 * quando o componente sai da tela), para ninguém voltar a uma página com um
 * menu ainda aberto.
 */
export function useCloseOnHide(
  open: boolean,
  setOpen: (open: boolean) => void,
) {
  const latest = useRef({ open, setOpen });
  useLayoutEffect(() => {
    latest.current = { open, setOpen };
  });
  useLayoutEffect(() => {
    return () => {
      if (latest.current.open) latest.current.setOpen(false);
    };
  }, []);
}
