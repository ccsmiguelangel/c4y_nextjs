"use client";

import { AdminHeader } from "./admin-header";
import { commonClasses } from "@/lib/design-system";
import { ReactNode } from "react";

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
    <div className="flex flex-1 flex-col min-w-0 min-h-screen">
      <AdminHeader
        title={title}
        leftActions={leftActions}
        rightActions={rightActions}
        showFilterAction={showFilterAction}
        onFilterActionClick={onFilterActionClick}
      />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className={commonClasses.mainContainer}>
          {children}
        </main>
      </div>
    </div>
  );
}

