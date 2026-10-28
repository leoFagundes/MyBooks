import { FileBraces, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Baixar tudo em JSON, ou a estante em CSV no formato do Goodreads. */
export function ExportData() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Exportar meus dados</h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <a href="/api/account/export?formato=json" download>
            <FileBraces aria-hidden />
            Baixar em JSON
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/api/account/export?formato=csv" download>
            <FileSpreadsheet aria-hidden />
            Baixar em CSV
          </a>
        </Button>
      </div>
      <p className="text-xs text-pretty text-muted-foreground">
        O JSON traz tudo: perfil, estante, citações, coleções e quem você segue.
        O CSV traz a estante no formato do Goodreads, que outros apps de leitura
        sabem importar.
      </p>
    </div>
  );
}
