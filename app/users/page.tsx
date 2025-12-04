"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components_shadcn/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components_shadcn/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components_shadcn/ui/avatar";
import { Separator } from "@/components_shadcn/ui/separator";
import { MoreVertical, ArrowUpDown, Tag, User as UserIcon, ChevronRight, Plus } from "lucide-react";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface User {
  id: string;
  name: string;
  contact: string;
  avatar?: string;
  status: "activo" | "lead" | "vip";
  vendedor?: string;
}

const users: User[] = [
  {
    id: "1",
    name: "Alejandro Gomez",
    contact: "+34 612 345 678",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeP0WOO_emI8zYv8K2OFVM-JWtkYiwQHKorZPb1Lu1zxouBvi_-3x_UEO8EAi4uiWk0YGMrRypONstn9oPJ_9EfEW7NTXnyvhwL1_A8YmbvkJHK_wZVHUOhE8boLjjwudUl1Z4vb1-O8faA-35tD0O6uU1HVfrwg7p5aNnrpuqBVLZl4gYgNyyEi6IxafWO5dCfZzTcEMEnx4F0XLEfi4QN_grFv3C_q-mgvXuFslPwisodZWNTzrfSxTl0MDlu-9Ks4SE07kUqpc",
    status: "activo",
    vendedor: "Juan Pérez",
  },
  {
    id: "2",
    name: "Beatriz Fernández",
    contact: "beatriz.f@email.com",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCEB-3XKUYmOr9W6KntDx6Vq1wxTNOhPVnX0GorIPVOVG0dfbLHo_fg5wGlPjGuOkf-xbaWFhgkvmzi-z2vn5PbjKZ0vtdQhk-NdM07FR8-6OzR0ph0UXiszKIzY7Xdyibm9xgLpoMibeB-qPOHaQIn4JN9JAnOGamzDYvxRrL2qXeF7m7P0rRtOj2iU6Fqx0NWNoVG2K5jvz-UEFBCykp_4Dkw7wMy8vg7udSCnlJOPclE2ObH7QTG9DVQioDLdLWIHwSKYuYef8A",
    status: "lead",
  },
  {
    id: "3",
    name: "Carlos Santana",
    contact: "Última compra: 15/03/2023",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBlV1Svfat0UTt97VHsCrRU-NUBkkf3-oLR1zimc7kwlhbjGDhRGlZuAlXOQmjwfYEOq8WVqWz-BZBS-DkTDn9ffVYkMcO5_OogUGeVinaT6d4OGgcmv2hE1bsNoHKYVmETomIZLKZiSyfHuZ64f9RzzW0J0qgEYs5ZZoYXqDWIugoNuYcO_plPuhj5-3P96dICAGZ4JUF_yoLCMAb-bzswLJF4Shoe-iPGMA3bw1xJXOzru4psoKb0IUjHDhxtyDPoh-wTfVpB12I",
    status: "vip",
    vendedor: "María González",
  },
  {
    id: "4",
    name: "Diana Moreno",
    contact: "+34 698 765 432",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuByJJhs0cEabmMFVU9WyQP0OPHK5vTRnfKkZVPZ-fbItSt9VnXJg08c3zq3a-MkSIqUETpKHlxt0IlsG07VT9eRMtLVl-e9fKZfATNQ4N4hG0Bn692VVnBnyvn4M28WTK7haKGpKZ4ZMUQZMnHwYiKh5_ZMZ_Bsale5OLXkceGmK63m5e7hh3x8M-d9TBAYse_t5BmZTqHgSsVEFnbogibenyhGS6Etx7MZbJqY7kjZOjIVTjOT4KGbG7rl-uPFmC8lVsm9phaOFDE",
    status: "lead",
    vendedor: "Juan Pérez",
  },
];

const statusConfig = {
  activo: { label: "Activo", className: "bg-green-100 text-green-800" },
  lead: { label: "Lead", className: "bg-orange-100 text-orange-800" },
  vip: { label: "VIP", className: "bg-blue-100 text-blue-800" },
};

export default function UsersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contact.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "lead") {
      matchesFilter = user.status === "lead";
    } else if (activeFilter === "vendedor") {
      matchesFilter = !!user.vendedor;
    } else if (activeFilter) {
      matchesFilter = user.status === activeFilter;
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

  return (
    <AdminLayout
      title="Clientes"
      showFilterAction
    >
        <section className={`flex flex-col ${spacing.gap.base}`}>
          <SearchInput
            variant="muted"
            placeholder="Buscar por nombre, teléfono, vehículo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <nav className={`flex ${spacing.gap.small} overflow-x-auto`}>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none`}
              onClick={() => setActiveFilter(null)}
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className={`${typography.body.base} text-foreground`}>Ordenar por</span>
            </Button>
            {activeFilter === "lead" ? (
              <Button
                size="sm"
                className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-primary/10 text-primary border-none hover:bg-primary/20`}
                onClick={() => setActiveFilter(null)}
              >
                <Tag className="h-4 w-4 shrink-0" />
                <span className={typography.body.base}>Lead</span>
                <span className="ml-1 shrink-0">×</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none`}
                onClick={() => setActiveFilter("lead")}
              >
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={`${typography.body.base} text-foreground`}>Lead</span>
              </Button>
            )}
            {activeFilter === "vendedor" ? (
              <Button
                size="sm"
                className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-primary/10 text-primary border-none hover:bg-primary/20`}
                onClick={() => setActiveFilter(null)}
              >
                <UserIcon className="h-4 w-4 shrink-0" />
                <span className={typography.body.base}>Vendedor</span>
                <span className="ml-1 shrink-0">×</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none`}
                onClick={() => setActiveFilter("vendedor")}
              >
                <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={`${typography.body.base} text-foreground`}>Vendedor</span>
              </Button>
            )}
          </nav>
        </section>

        <Separator />

        <section className={`flex flex-col ${spacing.gap.base} pb-24`}>
          {filteredUsers.map((user) => (
            <article
              key={user.id}
              onClick={() => router.push(`/users/details/${user.id}`)}
              className={`flex items-center ${spacing.gap.medium} min-h-[88px] py-4 justify-between border-b border-border cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
            >
              <div className={`flex items-center ${spacing.gap.medium} flex-1 min-w-0`}>
                <Avatar className="h-14 w-14 shrink-0 rounded-full">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={`Avatar de ${user.name}`} className="rounded-full" />
                  ) : null}
                  <AvatarFallback className="rounded-full text-base">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <p className={`${typography.body.large} line-clamp-1 text-base`}>{user.name}</p>
                  <p className={`${typography.body.small} line-clamp-2 text-sm`}>{user.contact}</p>
                </div>
              </div>
              <div className={`shrink-0 flex items-center ${spacing.gap.small}`}>
                <Badge className={`${statusConfig[user.status].className} rounded-full px-3 py-1 text-xs font-medium`}>
                  {statusConfig[user.status].label}
                </Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </article>
          ))}
        </section>

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary text-white hover:bg-primary/90"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </AdminLayout>
  );
}
