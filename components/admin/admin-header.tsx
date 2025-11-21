"use client";

import { Separator } from "@/components_shadcn/ui/separator";
import { typography } from "@/lib/design-system";
import { ReactNode } from "react";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

interface AdminHeaderProps {
  title: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
}

export function AdminHeader({ title, leftActions, rightActions }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 px-4 border-b bg-background/80 backdrop-blur-sm">
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
        {rightActions && rightActions}
      </div>
    </header>
  );
}

