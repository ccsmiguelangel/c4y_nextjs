"use client";

import { LogoutButton } from "@/components/ui/logout-button";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Bell, User, MoreVertical, Filter, CircleDot, Zap, Wrench, Plus, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { commonClasses, spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface InventoryItem {
  id: string;
  code: string;
  description: string;
  assignedTo: string;
  stock: number;
  icon: "filter" | "disc" | "bolt" | "tire";
  stockStatus: "high" | "medium" | "low";
}

const inventoryItems: InventoryItem[] = [
  {
    id: "1",
    code: "FLTR-001",
    description: "Filtro de aceite motor 1.6L",
    assignedTo: "Taller Mecánico",
    stock: 50,
    icon: "filter",
    stockStatus: "high",
  },
  {
    id: "2",
    code: "BRK-PAD-012",
    description: "Pastillas de freno delanteras",
    assignedTo: "J. Pérez",
    stock: 12,
    icon: "disc",
    stockStatus: "medium",
  },
  {
    id: "3",
    code: "SPRK-PLG-08",
    description: "Bujía de encendido Iridium",
    assignedTo: "Almacén Central",
    stock: 120,
    icon: "bolt",
    stockStatus: "high",
  },
  {
    id: "4",
    code: "TYR-205-55R16",
    description: "Neumático Michelin Primacy 4",
    assignedTo: "Almacén Principal",
    stock: 4,
    icon: "tire",
    stockStatus: "low",
  },
];

const getStockBadge = (status: "high" | "medium" | "low", stock: number) => {
  switch (status) {
    case "high":
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-full px-3 py-1 text-sm font-medium">
          Stock: {stock}
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded-full px-3 py-1 text-sm font-medium">
          Stock: {stock}
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-full px-3 py-1 text-sm font-medium">
          Stock: {stock}
        </Badge>
      );
  }
};

const getIcon = (icon: "filter" | "disc" | "bolt" | "tire") => {
  switch (icon) {
    case "filter":
      return <Filter className="h-6 w-6" />;
    case "disc":
      return <CircleDot className="h-6 w-6" />;
    case "bolt":
      return <Zap className="h-6 w-6" />;
    case "tire":
      return <Wrench className="h-6 w-6" />;
  }
};

export default function StockPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = inventoryItems.filter((item) =>
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout
      title="Inventario de Piezas"
      rightActions={
        <>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex items-center justify-center">
            <Filter className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5" />
          </Button>
          <LogoutButton />
        </>
      }
    >
        {/* Search Bar */}
        <div className="px-0">
          <SearchInput
            variant="muted"
            placeholder="Buscar por código, descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Inventory List */}
        <div className={`flex flex-col ${spacing.gap.base}`}>
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className={`${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
              onClick={() => router.push(`/stock/details/${item.id}`)}
            >
              <CardContent className={spacing.card.padding}>
                <div className={`flex flex-col ${spacing.gap.medium} justify-between`}>
                  <div className="flex items-start gap-4">
                    <div className="text-muted-foreground flex items-center justify-center rounded-lg bg-muted shrink-0 size-12">
                      {getIcon(item.icon)}
                    </div>
                    <div className="flex flex-1 flex-col justify-center min-w-0">
                      <p className={`${typography.body.large} font-bold`}>{item.code}</p>
                      <p className={typography.body.base}>{item.description}</p>
                      <p className={`${typography.body.small} mt-1`}>Asignado a: {item.assignedTo}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-muted-foreground flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {getStockBadge(item.stockStatus, item.stock)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary text-white hover:bg-primary/90"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </AdminLayout>
  );
}
