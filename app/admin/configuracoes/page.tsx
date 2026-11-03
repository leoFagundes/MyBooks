import type { Metadata } from "next";
import { AdminPage } from "@/features/admin/components/admin-page";
import { SiteSettingsForm } from "@/features/admin/components/site-settings-form";
import { ForumCategoriesForm } from "@/features/admin/components/forum-categories-form";
import {
  getAdminCategories,
  getSiteSettings,
  requireStaff,
} from "@/features/admin/queries";

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
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    getAdminCategories(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <SiteSettingsForm settings={settings} />
      <ForumCategoriesForm categories={categories} />
    </div>
  );
}
