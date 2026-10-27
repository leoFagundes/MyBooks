import { EmptyState } from "@/components/ui/empty-state";
import { LockedShelfIllustration } from "@/components/ui/illustrations";
import type { ProfileRelation, ProfileSummary } from "../queries";

/** O que quem não segue um perfil privado vê no lugar das abas. */
export function PrivateProfileNotice({
  profile,
  relation,
}: {
  profile: Pick<ProfileSummary, "username">;
  relation: ProfileRelation;
}) {
  return (
    <EmptyState
      illustration={LockedShelfIllustration}
      title="Este perfil é privado"
      description={
        relation === "requested"
          ? `Seu pedido para seguir @${profile.username} está esperando resposta. Quando for aceito, a estante aparece aqui.`
          : `Só quem @${profile.username} aprova vê a estante, as coleções e as citações.`
      }
    />
  );
}
