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
        <ScrollAreaPrimitive.Viewport 
          className="h-full w-full rounded-[inherit] scroll-smooth"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px),
              repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px),
              radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0),
              radial-gradient(circle at 6px 6px, rgba(0,0,0,0.05) 1px, transparent 0)
            `,
            backgroundSize: '100% 4px, 4px 100%, 8px 8px, 12px 12px',
            backgroundPosition: '0 0, 0 0, 0 0, 4px 4px',
          } as React.CSSProperties}
        >
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

