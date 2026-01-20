"use client";

import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { MoreVertical, Filter, CircleDot, Zap, Wrench, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { commonClasses, spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import { toast } from "@/lib/toast";
import type { InventoryItemCard, StockStatus, InventoryIcon } from "@/validations/types";
import {
  AddInventoryItemButton,
  CreateInventoryItemDialog,
  CreateInventoryItemFormData,
} from "./components/stock-dialogs";

const createInitialFormData = (): CreateInventoryItemFormData => ({
  code: "",
  description: "",
  stock: "",
  minStock: "",
  maxStock: "",
  unit: "",
  assignedTo: "",
  location: "",
  supplier: "",
  icon: "filter",
});

const getStockBadge = (status: StockStatus, stock: number) => {
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

const getIcon = (icon: InventoryIcon) => {
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
  const [items, setItems] = useState<InventoryItemCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para el diálogo de crear item
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateInventoryItemFormData>(() => createInitialFormData());

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/inventory", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Inventory request failed");
      }
      const { data } = (await response.json()) as { data?: InventoryItemCard[] };
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading inventory:", error);
      toast.error("No pudimos cargar el inventario. Intenta nuevamente.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = items.filter((item) =>
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Validar si todos los campos requeridos están llenos
  const isFormValid = useMemo(() => {
    const stock = Number(formData.stock);
    
    return (
      formData.code.trim() !== "" &&
      formData.description.trim() !== "" &&
      formData.stock.trim() !== "" &&
      !isNaN(stock) &&
      stock >= 0
    );
  }, [formData]);

  const resetForm = () => {
    setFormData(createInitialFormData());
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleCancelCreateDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleCreateItem = async () => {
    // Validar campos requeridos
    if (!formData.code || !formData.description || !formData.stock) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // Validar stock
    const stock = Number(formData.stock);
    if (isNaN(stock) || stock < 0) {
      toast.error("El stock debe ser un número válido mayor o igual a 0");
      return;
    }

    // Validar minStock si está presente
    if (formData.minStock && (isNaN(Number(formData.minStock)) || Number(formData.minStock) < 0)) {
      toast.error("El stock mínimo debe ser un número válido mayor o igual a 0");
      return;
    }

    // Validar maxStock si está presente
    if (formData.maxStock && (isNaN(Number(formData.maxStock)) || Number(formData.maxStock) < 0)) {
      toast.error("El stock máximo debe ser un número válido mayor o igual a 0");
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        code: formData.code,
        description: formData.description,
        stock: stock,
        minStock: formData.minStock ? Number(formData.minStock) : undefined,
        maxStock: formData.maxStock ? Number(formData.maxStock) : undefined,
        unit: formData.unit || undefined,
        assignedTo: formData.assignedTo || undefined,
        location: formData.location || undefined,
        supplier: formData.supplier || undefined,
        icon: formData.icon,
      };

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo crear la pieza");
      }

      const { data } = (await response.json()) as { data: InventoryItemCard };
      
      toast.success("Pieza creada exitosamente");
      setIsDialogOpen(false);
      resetForm();
      await loadItems();
      // Navegar al detalle de la pieza creada
      router.push(`/stock/details/${data.documentId ?? data.id}`);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo crear la pieza");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AdminLayout
      title="Inventario de Piezas"
      showFilterAction
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
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className={`${commonClasses.card}`}>
                <CardContent className={spacing.card.padding}>
                  <div className={`flex flex-col ${spacing.gap.medium} justify-between`}>
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex flex-1 flex-col justify-center min-w-0 gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Skeleton className="h-10 w-10 rounded" />
                        <Skeleton className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredItems.length === 0 ? (
            <p className={`${typography.body.base} text-muted-foreground text-center py-8`}>
              {searchQuery ? "No se encontraron resultados." : "No hay piezas en el inventario."}
            </p>
          ) : (
            filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className={`${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
                onClick={() => router.push(`/stock/details/${item.documentId}`)}
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
                        {item.assignedTo && (
                          <p className={`${typography.body.small} mt-1`}>Asignado a: {item.assignedTo}</p>
                        )}
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
            ))
          )}
        </div>

      <AddInventoryItemButton onClick={() => setIsDialogOpen(true)} />

      <CreateInventoryItemDialog
        isOpen={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        formData={formData}
        setFormData={setFormData}
        isCreating={isCreating}
        isFormValid={isFormValid}
        onConfirm={handleCreateItem}
        onCancel={handleCancelCreateDialog}
      />
    </AdminLayout>
  );
}
