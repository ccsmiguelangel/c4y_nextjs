"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components_shadcn/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components_shadcn/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components_shadcn/ui/avatar";
import { Separator } from "@/components_shadcn/ui/separator";
import { MoreVertical, ArrowUpDown, Tag, User as UserIcon, ChevronRight, Plus, Shield, Briefcase, Car } from "lucide-react";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { strapiImages } from "@/lib/strapi-images";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import { toast } from "@/lib/toast";

interface UserProfile {
  id: number;
  documentId?: string;
  displayName: string;
  email?: string;
  phone?: string;
  role: "admin" | "seller" | "driver";
  department?: string;
  avatar?: {
    url?: string;
    alternativeText?: string;
  };
}

const roleConfig = {
  admin: { 
    label: "Administrador", 
    className: "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100",
    icon: Shield 
  },
  seller: { 
    label: "Vendedor", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
    icon: Briefcase 
  },
  driver: { 
    label: "Conductor", 
    className: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
    icon: Car 
  },
};

export default function UsersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/user-profiles", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }
      const { data } = await response.json();
      setUsers(data || []);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setError("No se pudieron cargar los usuarios");
      toast.error("Error al cargar usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "admin" || activeFilter === "seller" || activeFilter === "driver") {
      matchesFilter = user.role === activeFilter;
    }
    
    return matchesSearch && matchesFilter;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: UserProfile["role"]) => {
    const config = roleConfig[role];
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout title="Usuarios" showFilterAction>
        <section className={`flex flex-col ${spacing.gap.base} pb-24`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 min-h-[88px] py-4 border-b border-border">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </section>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Usuarios" showFilterAction>
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px]`}>
          <p className={typography.body.large}>{error}</p>
          <Button onClick={loadUsers}>Reintentar</Button>
        </section>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Usuarios"
      showFilterAction
    >
      <section className={`flex flex-col ${spacing.gap.base}`}>
        <SearchInput
          variant="muted"
          placeholder="Buscar por nombre, email, teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <ScrollAreaPrimitive.Root className="relative w-full overflow-hidden">
          <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
            <nav className={`flex ${spacing.gap.small} whitespace-nowrap`}>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none`}
                onClick={() => setActiveFilter(null)}
              >
                <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={`${typography.body.base} text-foreground`}>Todos</span>
              </Button>
              {(["admin", "seller", "driver"] as const).map((role) => {
                const config = roleConfig[role];
                const Icon = config.icon;
                const isActive = activeFilter === role;
                return (
                  <Button
                    key={role}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg ${isActive ? "bg-primary/10 text-primary border-none hover:bg-primary/20" : "bg-muted border-none"}`}
                    onClick={() => setActiveFilter(isActive ? null : role)}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "" : "text-muted-foreground"}`} />
                    <span className={typography.body.base}>{config.label}</span>
                    {isActive && <span className="ml-1 shrink-0">×</span>}
                  </Button>
                );
              })}
            </nav>
          </ScrollAreaPrimitive.Viewport>
          <ScrollAreaPrimitive.ScrollAreaScrollbar
            orientation="horizontal"
            className="flex touch-none select-none transition-colors w-full h-2.5 border-t border-t-transparent p-[1px]"
          >
            <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
          </ScrollAreaPrimitive.ScrollAreaScrollbar>
          <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
      </section>

      <Separator />

      <section className={`flex flex-col ${spacing.gap.base} pb-24`}>
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <p className={typography.body.large}>No se encontraron usuarios</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <article
              key={user.id}
              onClick={() => router.push(`/users/details/${user.documentId || user.id}`)}
              className={`flex items-center ${spacing.gap.medium} min-h-[88px] py-4 justify-between border-b border-border cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
            >
              <div className={`flex items-center ${spacing.gap.medium} flex-1 min-w-0`}>
                <Avatar className="h-14 w-14 shrink-0 rounded-full overflow-hidden ring-2 ring-background">
                  {user.avatar?.url ? (
                    <AvatarImage 
                      src={strapiImages.getURL(user.avatar.url)} 
                      alt={user.avatar.alternativeText || `Avatar de ${user.displayName}`} 
                      className="rounded-full object-cover w-full h-full" 
                    />
                  ) : null}
                  <AvatarFallback className="rounded-full text-base w-full h-full flex items-center justify-center bg-muted">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <p className={`${typography.body.large} line-clamp-1 text-base`}>
                    {user.displayName}
                  </p>
                  <p className={`${typography.body.small} line-clamp-2 text-sm text-muted-foreground`}>
                    {user.email || user.phone || "Sin contacto"}
                  </p>
                </div>
              </div>
              <div className={`shrink-0 flex items-center ${spacing.gap.small}`}>
                {getRoleBadge(user.role)}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </article>
          ))
        )}
      </section>

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary text-white hover:bg-primary/90"
        size="icon"
        onClick={() => router.push("/users/details/new")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </AdminLayout>
  );
}
