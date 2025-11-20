"use client";

import { Separator } from "@/components_shadcn/ui/separator";
import { typography } from "@/lib/design-system";
import { ReactNode } from "react";
import { MobileMenu } from "./mobile-menu";

interface AdminHeaderProps {
  title: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
}

export function AdminHeader({ title, leftActions, rightActions }: AdminHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
      <MobileMenu />
      {leftActions && (
        <>
          {leftActions}
          <Separator orientation="vertical" className="mr-2 h-4" />
        </>
      )}
      {!leftActions && <Separator orientation="vertical" className="mr-2 h-4" />}
      <h1 className={typography.h3}>{title}</h1>
      {rightActions && (
        <div className="ml-auto flex items-center gap-3">
          {rightActions}
        </div>
      )}
    </header>
  );
}

