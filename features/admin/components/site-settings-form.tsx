"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import { saveBanner, saveFeatures, saveMaintenance } from "../actions";
import {
  type BannerTone,
  FEATURE_FLAGS,
  type FeatureFlag,
  type SiteSettings,
} from "../lib/settings";

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-card border border-border p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

/** Salva uma parte das configurações, com o erro esperado no próprio card. */
function useSave() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function save(run: () => Promise<ActionResult>, message: string) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (result.ok) toast.success(message);
      else setError(result.error);
    });
  }
  return { pending, error, save };
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <div aria-live="polite">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * As configurações do site (MELHORIAS 6): o aviso no topo das páginas, o
 * modo manutenção e as funcionalidades liga/desliga. Cada card salva sozinho
 * e entra na auditoria.
 */
export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const id = useId();
  const [banner, setBanner] = useState(settings.banner);
  const [maintenance, setMaintenance] = useState(settings.maintenance);
  const [features, setFeatures] = useState(settings.features);
  const bannerSave = useSave();
  const maintenanceSave = useSave();
  const featuresSave = useSave();

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Aviso no topo"
        description="Uma faixa fina no alto de todas as páginas, para avisos curtos."
      >
        <div className="flex items-center gap-3">
          <Switch
            id={`${id}-aviso`}
            checked={banner.enabled}
            onCheckedChange={(enabled) => setBanner({ ...banner, enabled })}
          />
          <Label htmlFor={`${id}-aviso`}>Mostrar o aviso</Label>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-aviso-texto`}>Texto</Label>
          <Textarea
            id={`${id}-aviso-texto`}
            rows={2}
            maxLength={200}
            value={banner.message}
            placeholder="Hoje à noite o MyBooks fica fora do ar por alguns minutos."
            onChange={(event) =>
              setBanner({ ...banner, message: event.target.value })
            }
          />
        </div>
        <SegmentedControl
          aria-label="Tom do aviso"
          size="sm"
          value={banner.tone}
          onValueChange={(tone: BannerTone) => setBanner({ ...banner, tone })}
          options={[
            { value: "info", label: "Informação" },
            { value: "aviso", label: "Atenção" },
          ]}
        />
        <ErrorLine error={bannerSave.error} />
        <Button
          className="self-start"
          disabled={bannerSave.pending}
          onClick={() =>
            bannerSave.save(() => saveBanner(banner), "Aviso salvo")
          }
        >
          {bannerSave.pending ? "Salvando…" : "Salvar o aviso"}
        </Button>
      </Card>

      <Card
        title="Modo manutenção"
        description="Quem não é da equipe vê só uma página de aviso. O painel e o entrar continuam abertos. Leva até 30 segundos para valer."
      >
        <div className="flex items-center gap-3">
          <Switch
            id={`${id}-manutencao`}
            checked={maintenance.enabled}
            onCheckedChange={(enabled) =>
              setMaintenance({ ...maintenance, enabled })
            }
          />
          <Label htmlFor={`${id}-manutencao`}>Ligar a manutenção</Label>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-manutencao-texto`}>Mensagem</Label>
          <Textarea
            id={`${id}-manutencao-texto`}
            rows={2}
            maxLength={300}
            value={maintenance.message}
            placeholder="Estamos arrumando as estantes. Voltamos já."
            onChange={(event) =>
              setMaintenance({ ...maintenance, message: event.target.value })
            }
          />
        </div>
        <ErrorLine error={maintenanceSave.error} />
        <Button
          className="self-start"
          disabled={maintenanceSave.pending}
          onClick={() =>
            maintenanceSave.save(
              () => saveMaintenance(maintenance),
              "Manutenção salva",
            )
          }
        >
          {maintenanceSave.pending ? "Salvando…" : "Salvar a manutenção"}
        </Button>
      </Card>

      <Card
        title="Funcionalidades"
        description="Desligue uma parte do MyBooks sem precisar de deploy."
      >
        <ul className="flex flex-col divide-y divide-border">
          {FEATURE_FLAGS.map((flag) => (
            <li
              key={flag.key}
              className="flex items-start justify-between gap-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <Label htmlFor={`${id}-${flag.key}`}>{flag.label}</Label>
                <p className="text-xs text-pretty text-muted-foreground">
                  {flag.description}
                </p>
              </div>
              <Switch
                id={`${id}-${flag.key}`}
                checked={features[flag.key]}
                onCheckedChange={(on) =>
                  setFeatures({ ...features, [flag.key as FeatureFlag]: on })
                }
              />
            </li>
          ))}
        </ul>
        <ErrorLine error={featuresSave.error} />
        <Button
          className="self-start"
          disabled={featuresSave.pending}
          onClick={() =>
            featuresSave.save(
              () => saveFeatures(features),
              "Funcionalidades salvas",
            )
          }
        >
          {featuresSave.pending ? "Salvando…" : "Salvar as funcionalidades"}
        </Button>
      </Card>
    </div>
  );
}
