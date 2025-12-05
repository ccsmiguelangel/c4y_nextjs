"use client";

import { AdminHeader } from "./admin-header";
import { commonClasses } from "@/lib/design-system";
import { ReactNode } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

interface AdminLayoutProps {
  title: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  showFilterAction?: boolean;
  onFilterActionClick?: () => void;
  children: ReactNode;
}

export function AdminLayout({
  title,
  leftActions,
  rightActions,
  showFilterAction = false,
  onFilterActionClick,
  children,
}: AdminLayoutProps) {
  return (
    <div className="flex h-screen flex-col min-w-0 overflow-hidden">
      <AdminHeader
        title={title}
        leftActions={leftActions}
        rightActions={rightActions}
        showFilterAction={showFilterAction}
        onFilterActionClick={onFilterActionClick}
      />
      <ScrollAreaPrimitive.Root className="relative flex-1 min-h-0 overflow-hidden">
        <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
          <main className={commonClasses.mainContainer}>
            {children}
          </main>
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.ScrollAreaScrollbar
          orientation="vertical"
          className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
        >
          <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </div>
  );
}

