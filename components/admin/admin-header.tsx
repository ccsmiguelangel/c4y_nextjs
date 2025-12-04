"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Filter, Bell, User as UserIcon } from "lucide-react";
import { Button } from "@/components_shadcn/ui/button";
import { Separator } from "@/components_shadcn/ui/separator";
import { typography } from "@/lib/design-system";
import { LogoutButton } from "@/components/ui/logout-button";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

interface AdminHeaderProps {
  title: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  showFilterAction?: boolean;
  onFilterActionClick?: () => void;
}

export function AdminHeader({
  title,
  leftActions,
  rightActions,
  showFilterAction = false,
  onFilterActionClick,
}: AdminHeaderProps) {
  const defaultRightActions = (
    <>
      {showFilterAction && (
        <Button
          variant="ghost"
          size="icon"
          className="flex h-10 w-10 items-center justify-center rounded-full"
          onClick={onFilterActionClick}
          aria-label="Abrir filtros"
        >
          <Filter className="h-5 w-5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="flex h-10 w-10 items-center justify-center rounded-full"
        aria-label="Ver notificaciones"
      >
        <Bell className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="flex h-10 w-10 items-center justify-center rounded-full"
        aria-label="Ir al perfil"
        asChild
      >
        <Link href="/profile">
          <UserIcon className="h-5 w-5" />
          <span className="sr-only">Ir al perfil</span>
        </Link>
      </Button>
      <LogoutButton />
    </>
  );

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
      <MobileMenu />
      {leftActions && (
        <>
          {leftActions}
          <Separator orientation="vertical" className="mr-2 h-4" />
        </>
      )}
      {!leftActions && <Separator orientation="vertical" className="mr-2 h-4" />}
      <h1 className={typography.h3}>{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {rightActions ?? defaultRightActions}
      </div>
    </header>
  );
}
