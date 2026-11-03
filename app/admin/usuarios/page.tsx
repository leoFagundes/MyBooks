import type { Metadata } from "next";
import { AdminPage } from "@/features/admin/components/admin-page";
import { UsersTable } from "@/features/admin/components/users-table";
import { requireStaff } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Usuários" };

/** Usuários: busca, perfil resumido, sanções, conteúdo e papéis. */
export default function AdminUsersPage() {
  return (
    <AdminPage
      title="Usuários"
      description="Busque uma conta para ver o resumo, suspender, banir ou remover o que ela publicou."
    >
      <Users />
    </AdminPage>
  );
}

async function Users() {
  const staff = await requireStaff();
  return <UsersTable role={staff.role} selfId={staff.id} />;
}
