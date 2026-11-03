import type { Metadata } from "next";
import { AdminPage } from "@/features/admin/components/admin-page";
import { AuditTable } from "@/features/admin/components/audit-table";
import { requireStaff } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Auditoria" };

/** Auditoria: toda ação administrativa, com o antes e o depois. Só o admin. */
export default function AdminAuditPage() {
  return (
    <AdminPage
      title="Auditoria"
      description="Quem fez, o quê, em quem e quando, com o antes e o depois."
    >
      <Audit />
    </AdminPage>
  );
}

async function Audit() {
  await requireStaff("admin");
  return <AuditTable />;
}
