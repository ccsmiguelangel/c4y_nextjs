"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components_shadcn/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components_shadcn/ui/sheet";
import { LayoutDashboard, User, Users, Settings, Calendar, Package, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/fleet",
    label: "Flota",
    icon: Car,
  },
  {
    href: "/users",
    label: "Usuarios",
    icon: Users,
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
    href: "/dashboard-user",
    label: "Dashboard Users",
    icon: User,
  },
  {
    href: "/adm-services",
    label: "Servicios",
    icon: Settings,
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
      <SheetContent side="left" className="w-[300px] sm:w-[400px] [&>button]:hidden">
        <SheetHeader className="flex flex-row items-center gap-4">
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 flex items-center justify-center">
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar menú</span>
            </Button>
          </SheetClose>
          <SheetTitle>Menú de Navegación</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-2">
          {navItems.map((item) => {
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
        </nav>
      </SheetContent>
    </Sheet>
  );
}

