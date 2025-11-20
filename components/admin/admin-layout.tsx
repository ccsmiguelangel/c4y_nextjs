"use client";

import { AdminHeader } from "./admin-header";
import { commonClasses } from "@/lib/design-system";
import { ReactNode } from "react";

interface AdminLayoutProps {
  title: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  children: ReactNode;
}

export function AdminLayout({ title, leftActions, rightActions, children }: AdminLayoutProps) {
  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-screen">
      <AdminHeader title={title} leftActions={leftActions} rightActions={rightActions} />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className={commonClasses.mainContainer}>
          {children}
        </main>
      </div>
    </div>
  );
}

