"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { routes } from "@/lib/routes";

/** Sair da conta, como no menu do avatar: a página recarrega do zero. */
export function SignOutButton() {
  const [leaving, startLeaving] = useTransition();
  return (
    <Button
      variant="outline"
      className="self-start"
      disabled={leaving}
      aria-busy={leaving}
      onClick={() =>
        startLeaving(async () => {
          const result = await signOut();
          if (result.ok) window.location.assign(routes.home);
          else toast.error(result.error);
        })
      }
    >
      <LogOut aria-hidden />
      Sair
    </Button>
  );
}
