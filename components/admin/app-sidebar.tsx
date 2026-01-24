"use client";

import type { ComponentType } from "react";
import { useState, useEffect } from "react";
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
import { LayoutDashboard, User, Users, Settings, Calendar, Package, Car, FileText, Bell, CreditCard, Cog } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
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
  {
    href: "/settings",
    label: "Configuración",
    icon: Cog,
    adminOnly: true,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/user-profile/me", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.data?.role || null);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    fetchUserRole();
  }, []);

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && userRole !== "admin") {
      return false;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Aplicación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
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

