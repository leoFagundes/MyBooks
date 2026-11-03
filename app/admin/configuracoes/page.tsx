import type { Metadata } from "next";
import { AdminPage } from "@/features/admin/components/admin-page";
import { SiteSettingsForm } from "@/features/admin/components/site-settings-form";
import { getSiteSettings, requireStaff } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Configurações do site" };

/** Configurações do site: aviso, manutenção e funcionalidades. Só o admin. */
export default function AdminSettingsPage() {
  return (
    <AdminPage
      title="Configurações do site"
      description="Valem para todo mundo e ficam registradas na auditoria."
    >
      <Settings />
    </AdminPage>
  );
}

async function Settings() {
  await requireStaff("admin");
  return <SiteSettingsForm settings={await getSiteSettings()} />;
}
