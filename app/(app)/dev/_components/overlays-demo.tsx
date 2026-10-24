"use client";

import {
  LogOut,
  Settings,
  SlidersHorizontal,
  SunMoon,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/components/shell/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { initials } from "@/lib/initials";
import { parseThemePreference } from "@/lib/theme";
import { DemoRow } from "./dev-section";

const statuses = [
  { value: "todos", label: "Todos" },
  { value: "lido", label: "Lido" },
  { value: "lendo", label: "Lendo" },
  { value: "quero", label: "Quero ler" },
] as const;

export function OverlaysDemo() {
  const [status, setStatus] =
    useState<(typeof statuses)[number]["value"]>("todos");
  const [page, setPage] = useState(142);
  const { preference, setPreference } = useTheme();

  return (
    <>
      <DemoRow label="Modal">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Remover da estante</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover da estante?</DialogTitle>
              <DialogDescription>
                O livro sai da sua estante, mas suas citações e sua resenha
                continuam guardadas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() => toast("Livro removido da estante")}
                >
                  Remover
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DemoRow>

      <DemoRow label="Gavetas">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal />
              Abrir filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="mx-auto max-w-lg">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Escolha o que aparece na sua estante.
              </SheetDescription>
            </SheetHeader>
            <SegmentedControl
              aria-label="Status nos filtros"
              value={status}
              onValueChange={setStatus}
              options={statuses}
              size="sm"
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="dev-ano">Publicado a partir de</Label>
              <Input
                id="dev-ano"
                type="number"
                inputMode="numeric"
                placeholder="1950"
              />
            </div>
            <SheetFooter>
              <Button>Mostrar 24 livros</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Gaveta lateral</Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Torto Arado</SheetTitle>
              <SheetDescription>Itamar Vieira Junior · 2019</SheetDescription>
            </SheetHeader>
            <p className="leading-relaxed text-pretty text-muted-foreground">
              Duas irmãs, Bibiana e Belonísia, crescem numa fazenda no sertão
              baiano. Um acidente na infância muda para sempre a forma como uma
              fala pela outra.
            </p>
          </SheetContent>
        </Sheet>
      </DemoRow>

      <DemoRow label="Popover, menu e tooltip">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Atualizar página</Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <p className="font-serif text-lg leading-tight">Torto Arado</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dev-pagina">Página atual</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="dev-pagina"
                  type="number"
                  min={0}
                  max={264}
                  value={page}
                  onChange={(event) => setPage(Number(event.target.value))}
                  className="w-24"
                />
                <span className="font-mono text-xs text-muted-foreground">
                  de 264
                </span>
              </div>
            </div>
            <Button size="sm" onClick={() => toast(`Página ${page} guardada`)}>
              Salvar
            </Button>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu da conta"
              className="cursor-pointer rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Avatar className="size-9">
                <AvatarFallback>{initials("Ana Lívia")}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>@analivia</DropdownMenuLabel>
            <DropdownMenuItem>
              <UserRound />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SunMoon />
                Tema
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={preference}
                  onValueChange={(value) =>
                    setPreference(parseThemePreference(value))
                  }
                >
                  <DropdownMenuRadioItem value="light">
                    Claro
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    Escuro
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    Sistema
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DemoRow>
    </>
  );
}
