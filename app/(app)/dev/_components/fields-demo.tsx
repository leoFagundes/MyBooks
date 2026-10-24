import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FieldsDemo() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="dev-titulo">Título</Label>
        <Input id="dev-titulo" placeholder="Ex.: Torto Arado" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dev-usuario">@usuário</Label>
        <Input
          id="dev-usuario"
          defaultValue="machado"
          aria-invalid
          aria-describedby="dev-usuario-erro"
        />
        <p id="dev-usuario-erro" className="text-xs text-destructive">
          Esse @usuário já tem dono. Que tal outro?
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="dev-resenha">Sua resenha</Label>
        <Textarea
          id="dev-resenha"
          placeholder="O que ficou com você depois da última página?"
        />
      </div>
    </div>
  );
}
