import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { ThemeSelect } from "@/components/shell/theme-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InstallAppButton } from "@/features/pwa/components/install-app-button";
import { initials } from "@/lib/initials";
import { routes } from "@/lib/routes";
import type { Genre } from "../../lib/genre-name";
import type { ProfileSummary } from "../../queries";
import { EditProfileSheet } from "../edit-profile-sheet";
import { DeleteAccount } from "./delete-account";
import { ExportData } from "./export-data";
import { PasswordForm } from "./password-form";
import { PrivacySetting } from "./privacy-setting";
import { SettingsSection } from "./settings-section";
import { SignOutButton } from "./sign-out-button";
import { UsernameSetting } from "./username-setting";

/**
 * As configurações (spec §5.10): perfil, conta, privacidade, aparência,
 * seus dados e excluir conta, uma seção depois da outra.
 */
export function SettingsSections({
  profile,
  genres,
  email,
  importer,
}: {
  profile: ProfileSummary;
  /** Os favoritos com nome, inclusive os criados e ainda em análise. */
  genres: Genre[];
  email: string | null;
  /** A importação do Goodreads, que mora na estante. */
  importer?: React.ReactNode;
}) {
  const name = profile.displayName || profile.username;

  return (
    <Stagger className="flex flex-col gap-6">
      <StaggerItem>
        <SettingsSection
          id="perfil"
          title="Perfil"
          description="Como os outros leitores veem você."
        >
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <p className="truncate font-serif text-xl">{name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                @{profile.username}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <EditProfileSheet profile={profile} genres={genres} />
            <Button variant="ghost" asChild>
              <Link href={routes.profile(profile.username)}>
                Ver meu perfil
              </Link>
            </Button>
          </div>
          <UsernameSetting username={profile.username} />
        </SettingsSection>
      </StaggerItem>

      <StaggerItem>
        <SettingsSection
          id="conta"
          title="Conta"
          description={
            email
              ? `Você entra com ${email}.`
              : "Você entra com a sua conta do Google."
          }
        >
          <PasswordForm />
          <SignOutButton />
        </SettingsSection>
      </StaggerItem>

      <StaggerItem>
        <SettingsSection
          id="privacidade"
          title="Privacidade"
          description="Quem vê sua estante, suas coleções e suas citações."
        >
          <PrivacySetting isPrivate={profile.isPrivate} />
        </SettingsSection>
      </StaggerItem>

      <StaggerItem>
        <SettingsSection
          id="aparencia"
          title="Aparência"
          description="Claro, escuro ou o mesmo do seu aparelho."
        >
          <ThemeSelect className="self-start" />
        </SettingsSection>
      </StaggerItem>

      <StaggerItem>
        <SettingsSection
          id="instalar-app"
          title="Instalar o app"
          description="O MyBooks na tela de início, abrindo direto, sem o navegador."
        >
          <InstallAppButton />
        </SettingsSection>
      </StaggerItem>

      <StaggerItem>
        <SettingsSection
          id="dados"
          title="Seus dados"
          description="Traga sua biblioteca de outro lugar, ou leve tudo com você."
        >
          {importer}
          <ExportData />
        </SettingsSection>
      </StaggerItem>

      <StaggerItem>
        <SettingsSection
          id="sugestoes"
          title="Ideias para o MyBooks"
          description="Viu algo que podia ser melhor, ou um bug? Conte para a gente."
        >
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={{ pathname: routes.sugestoes, query: { nova: "1" } }}>
                Enviar sugestão
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={routes.sugestoes}>Ver as sugestões</Link>
            </Button>
          </div>
        </SettingsSection>
      </StaggerItem>

      <StaggerItem>
        <SettingsSection
          id="excluir"
          title="Excluir conta"
          description="Para sempre: não dá para desfazer depois."
        >
          <DeleteAccount username={profile.username} />
        </SettingsSection>
      </StaggerItem>
    </Stagger>
  );
}

/** As seções enquanto a conta carrega, nas mesmas medidas. */
export function SettingsSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando as configurações"
      className="flex flex-col gap-6"
    >
      {["h-60", "h-56", "h-32", "h-28", "h-44"].map((height) => (
        <Skeleton key={height} className={`${height} rounded-card`} />
      ))}
    </div>
  );
}
