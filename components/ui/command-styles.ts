// Itens e grupos das paletas (cmdk): a do ⌘K e a de adicionar livro.

/** Mesmo sinal dos menus: fundo sutil mais a barra de acento, que tem 3:1. */
export const commandItemClasses =
  "relative flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm text-foreground select-none before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-ring before:opacity-0 data-[selected=true]:bg-muted data-[selected=true]:before:opacity-100 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

export const commandGroupClasses =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase";

export const commandInputClasses =
  "h-13 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground";
