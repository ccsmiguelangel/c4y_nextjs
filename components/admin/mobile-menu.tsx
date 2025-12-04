"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components_shadcn/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components_shadcn/ui/sheet";
import {
  LayoutDashboard,
  User,
  Users,
  Settings,
  Calendar,
  Package,
  Car,
  FileText,
  Bell,
  CreditCard,
} from "lucide-react";
import { spacing, typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const adminNavSections: NavSection[] = [
  {
    label: "Aplicación",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/dashboard-user",
        label: "Dashboard Users",
        icon: User,
      },
      {
        href: "/users",
        label: "Usuarios",
        icon: Users,
      },
      {
        href: "/adm-services",
        label: "Servicios",
        icon: Settings,
      },
      {
        href: "/calendar",
        label: "Calendario",
        icon: Calendar,
      },
      {
        href: "/stock",
        label: "Inventario",
        icon: Package,
      },
      {
        href: "/fleet",
        label: "Flota",
        icon: Car,
      },
      {
        href: "/deal",
        label: "Contratos",
        icon: FileText,
      },
      {
        href: "/notifications",
        label: "Notificaciones",
        icon: Bell,
      },
      {
        href: "/billing",
        label: "Facturación",
        icon: CreditCard,
      },
    ],
  },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 flex items-center justify-center">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] [&>button]:hidden bg-background/80 backdrop-blur-sm">
        <SheetHeader>
          <SheetTitle>Menú de Navegación</SheetTitle>
        </SheetHeader>
        <nav className={cn("mt-6 flex flex-col", spacing.gap.large)}>
          {adminNavSections.map((section) => (
            <div key={section.label} className={cn("flex flex-col", spacing.gap.small)}>
              <p className={cn(typography.label, "px-4 uppercase tracking-wide text-muted-foreground/80")}>
                {section.label}
              </p>
              <div className={cn("flex flex-col", spacing.gap.small)}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

