import type { Metadata } from "next";
import { AdminPage } from "@/features/admin/components/admin-page";
import { ModerationQueues } from "@/features/admin/components/moderation-queues";
import { requireStaff } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Moderação" };

/** Moderação do catálogo: livros novos, sugestões e gêneros. */
export default function AdminModerationPage() {
  return (
    <AdminPage
      title="Moderação"
      description="Livros cadastrados à mão, sugestões de edição e de exclusão, e gêneros criados por leitores."
    >
      <Queues />
    </AdminPage>
  );
}

async function Queues() {
  await requireStaff();
  return <ModerationQueues />;
}
