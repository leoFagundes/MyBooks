"use client";

import { ArrowDownUp, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { genreLabel } from "@/features/profile/genres";
import { formatNumber } from "@/lib/format";
import { pressScale, springs, tweens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  decadeLabel,
  RATING_FILTERS,
  RATING_LABEL,
  type RatingFilter,
  SHELF_SORTS,
  type ShelfFilters,
  type ShelfSort,
  SORT_LABEL,
} from "../lib/filters";
import type { ShelfStatus } from "../schemas";
import { type ShelfView, shelfViewOptions } from "./shelf-views";

const ALL = "todos";

const STATUS_LABELS: { value: ShelfStatus | typeof ALL; label: string }[] = [
  { value: ALL, label: "Todos" },
  { value: "read", label: "Lido" },
  { value: "reading", label: "Lendo" },
  { value: "want", label: "Quero ler" },
  { value: "abandoned", label: "Abandonado" },
];

type Choice<T> = { value: T; label: string; count?: number };

/** Opções de liga e desliga; apertar a escolhida tira o filtro. */
function ChoiceGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly Choice<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <motion.button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option.value)}
              whileTap={{ scale: pressScale }}
              transition={springs.snappy}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-foreground hover:bg-muted",
              )}
            >
              {option.label}
              {option.count !== undefined ? (
                <span className="font-mono text-[11px] tabular-nums">
                  {formatNumber(option.count)}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Status com as contagens, busca, filtros (gênero, nota e década), ordem e
 * visualização. Os filtros ligados viram chips que entram e saem com mola.
 */
export function ShelfToolbar({
  filters,
  query,
  counts,
  genres,
  decades,
  onQueryChange,
  onChange,
}: {
  filters: ShelfFilters;
  query: string;
  counts: Record<ShelfStatus | "all", number>;
  genres: readonly Choice<string>[];
  decades: readonly Choice<number>[];
  onQueryChange: (query: string) => void;
  onChange: (changes: Partial<ShelfFilters>) => void;
}) {
  const statusOptions = STATUS_LABELS.map((option) => ({
    ...option,
    count: counts[option.value === ALL ? "all" : option.value],
  }));
  const ratingOptions = RATING_FILTERS.map((value) => ({
    value,
    label: RATING_LABEL[value],
  }));
  const refinements = [filters.genre, filters.rating, filters.decade].filter(
    (value) => value !== null,
  ).length;

  const chips: { key: string; label: string; clear: Partial<ShelfFilters> }[] =
    [];
  if (query.trim()) {
    chips.push({ key: "q", label: `“${query.trim()}”`, clear: { q: "" } });
  }
  if (filters.genre) {
    chips.push({
      key: "genero",
      label: genreLabel(filters.genre) ?? filters.genre,
      clear: { genre: null },
    });
  }
  if (filters.rating) {
    chips.push({
      key: "nota",
      label: RATING_LABEL[filters.rating],
      clear: { rating: null },
    });
  }
  if (filters.decade) {
    chips.push({
      key: "ano",
      label: decadeLabel(filters.decade),
      clear: { decade: null },
    });
  }

  function clearChip(clear: Partial<ShelfFilters>) {
    if ("q" in clear) onQueryChange("");
    onChange(clear);
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        aria-label="Status"
        options={statusOptions}
        value={filters.status ?? ALL}
        onValueChange={(value) =>
          onChange({ status: value === ALL ? null : value })
        }
        className="self-start"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar na estante"
            placeholder="Buscar por título ou autoria"
            autoComplete="off"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10">
              <SlidersHorizontal />
              Filtros
              {refinements > 0 ? (
                <span className="font-mono text-xs tabular-nums">
                  {refinements}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 gap-5 sm:w-96">
            <ChoiceGroup
              legend="Gênero"
              options={genres}
              value={filters.genre}
              onChange={(genre) => onChange({ genre })}
            />
            <ChoiceGroup<RatingFilter>
              legend="Nota"
              options={ratingOptions}
              value={filters.rating}
              onChange={(rating) => onChange({ rating })}
            />
            <ChoiceGroup
              legend="Publicado nos"
              options={decades}
              value={filters.decade}
              onChange={(decade) => onChange({ decade })}
            />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10"
              aria-label={`Ordenar: ${SORT_LABEL[filters.sort]}`}
            >
              <ArrowDownUp />
              {SORT_LABEL[filters.sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filters.sort}
              onValueChange={(sort) => onChange({ sort: sort as ShelfSort })}
            >
              {SHELF_SORTS.map((sort) => (
                <DropdownMenuRadioItem key={sort} value={sort}>
                  {SORT_LABEL[sort]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <SegmentedControl<ShelfView>
          aria-label="Visualização"
          value={filters.view}
          onValueChange={(view) => onChange({ view })}
          options={shelfViewOptions}
        />
      </div>

      <ul
        aria-label="Filtros ligados"
        className="flex flex-wrap items-center gap-2 empty:hidden"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {chips.map((chip) => (
            <motion.li
              key={chip.key}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: tweens.fast }}
              transition={springs.snappy}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-surface pr-1 pl-3 text-sm"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Tirar o filtro ${chip.label}`}
                onClick={() => clearChip(chip.clear)}
                className="grid size-6 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </motion.li>
          ))}
          {chips.length > 1 ? (
            <motion.li
              key="limpar"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: tweens.fast }}
              transition={springs.snappy}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  clearChip({ q: "", genre: null, rating: null, decade: null })
                }
              >
                Limpar filtros
              </Button>
            </motion.li>
          ) : null}
        </AnimatePresence>
      </ul>
    </div>
  );
}
