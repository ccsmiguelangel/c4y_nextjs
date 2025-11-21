"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components_shadcn/ui/sidebar";
import { LayoutDashboard, User, Users, Settings, Calendar, Package, Car, FileText, Bell, CreditCard } from "lucide-react";

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
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Aplicación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

