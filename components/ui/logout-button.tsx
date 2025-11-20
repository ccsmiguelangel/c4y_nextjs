"use client";

import { Button } from "@/components_shadcn/ui/button";
import { actions } from "@/actions";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const handleLogout = async () => {
    await actions.auth.logoutAction();
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </Button>
  );
}




