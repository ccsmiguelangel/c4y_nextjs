"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { 
  ArrowLeft, 
  MoreVertical, 
  Edit,
  Trash2,
  Package,
  User,
  AlertCircle,
  CheckCircle,
  Filter,
  CircleDot,
  Zap,
  Wrench
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface InventoryItemData {
  id: string;
  code: string;
  description: string;
  assignedTo: string;
  stock: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  lastRestocked?: string;
  icon: "filter" | "disc" | "bolt" | "tire";
  stockStatus: "high" | "medium" | "low";
}

const getInventoryItemData = (id: string): InventoryItemData | null => {
  const items: Record<string, InventoryItemData> = {
    "1": {
      id: "1",
      code: "FLTR-001",
      description: "Filtro de aceite motor 1.6L",
      assignedTo: "Taller Mecánico",
      stock: 50,
      minStock: 20,
      maxStock: 100,
      unit: "unidades",
      location: "Almacén A - Estante 3",
      supplier: "Repuestos ABC",
      lastRestocked: "2024-09-15",
      icon: "filter",
      stockStatus: "high",
    },
    "2": {
      id: "2",
      code: "BRK-PAD-012",
      description: "Pastillas de freno delanteras",
      assignedTo: "J. Pérez",
      stock: 12,
      minStock: 15,
      maxStock: 50,
      unit: "pares",
      location: "Almacén B - Estante 1",
      supplier: "Frenos XYZ",
      lastRestocked: "2024-08-20",
      icon: "disc",
      stockStatus: "medium",
    },
    "3": {
      id: "3",
      code: "SPRK-PLG-08",
      description: "Bujía de encendido Iridium",
      assignedTo: "Almacén Central",
      stock: 120,
      minStock: 30,
      maxStock: 200,
      unit: "unidades",
      location: "Almacén Central - Estante 5",
      supplier: "Spark Plugs Co.",
      lastRestocked: "2024-10-01",
      icon: "bolt",
      stockStatus: "high",
    },
    "4": {
      id: "4",
      code: "TYR-205-55R16",
      description: "Neumático Michelin Primacy 4",
      assignedTo: "Almacén Principal",
      stock: 4,
      minStock: 10,
      maxStock: 30,
      unit: "unidades",
      location: "Almacén Principal - Zona Neumáticos",
      supplier: "Michelin Distribuidor",
      lastRestocked: "2024-07-10",
      icon: "tire",
      stockStatus: "low",
    },
  };
  return items[id] || null;
};

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
      return Filter;
    case "disc":
      return CircleDot;
    case "bolt":
      return Zap;
    case "tire":
      return Wrench;
  }
};

export default function StockDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState("");
  const [formData, setFormData] = useState({
    stock: "",
    assignedTo: "",
    location: "",
    description: "",
  });

  const itemData = getInventoryItemData(itemId);

  // Inicializar formData cuando se carga el item
  useEffect(() => {
    if (itemData && !formData.stock) {
      setFormData({
        stock: itemData.stock.toString(),
        assignedTo: itemData.assignedTo,
        location: itemData.location || "",
        description: itemData.description,
      });
    }
  }, [itemData]);

  if (!itemData) {
    return (
      <AdminLayout title="Pieza no encontrada">
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px]`}>
          <p className={typography.body.large}>La pieza solicitada no existe.</p>
          <Button onClick={() => router.push("/stock")}>
            Volver a Inventario
          </Button>
        </section>
      </AdminLayout>
    );
  }

  const handleSaveNote = () => {
    console.log("Nota guardada:", note, "para pieza:", itemId);
    setNote("");
  };

  const handleSaveChanges = () => {
    console.log("Cambios guardados:", formData, "para pieza:", itemId);
    setIsEditing(false);
  };

  const IconComponent = getIcon(itemData.icon);

  return (
    <AdminLayout title={itemData.code}>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Información de la Pieza */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardContent className={`flex flex-col items-center ${spacing.gap.base} p-6 relative`}>
            {/* Botones de navegación */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full flex items-center justify-center"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex items-center justify-center">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[8rem]">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditing(true)}>
                    Editar Pieza
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" className="cursor-pointer">
                    Eliminar Pieza
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Icono */}
            <div className={`flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary mt-8`}>
              <IconComponent className="h-8 w-8" />
            </div>

            {/* Código y Badge */}
            <div className="flex flex-col items-center text-center">
              <h2 className={`${typography.h3} text-center`}>
                {itemData.code}
              </h2>
              <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                {itemData.description}
              </p>
              <div className="mt-2">{getStockBadge(itemData.stockStatus, itemData.stock)}</div>
            </div>

            {/* Botones de acción */}
            <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-5 w-5 flex-shrink-0" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                onClick={() => {
                  // Acción de eliminar
                }}
              >
                <Trash2 className="h-5 w-5 flex-shrink-0" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información Detallada */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Información del Inventario</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {isEditing ? (
              <>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="stock">Stock Actual</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="assignedTo">Asignado a</Label>
                  <Input
                    id="assignedTo"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder="Taller Mecánico"
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Almacén A - Estante 3"
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className={`flex ${spacing.gap.small} mt-2`}>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleSaveChanges}
                  >
                    Guardar Cambios
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Stock Actual</p>
                    <p className={`${typography.body.large} font-semibold`}>
                      {itemData.stock} {itemData.unit || "unidades"}
                    </p>
                  </div>
                </div>
                {itemData.minStock !== undefined && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Stock Mínimo</p>
                      <p className={typography.body.base}>{itemData.minStock} {itemData.unit || "unidades"}</p>
                    </div>
                  </div>
                )}
                {itemData.maxStock !== undefined && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Stock Máximo</p>
                      <p className={typography.body.base}>{itemData.maxStock} {itemData.unit || "unidades"}</p>
                    </div>
                  </div>
                )}
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Asignado a</p>
                    <p className={typography.body.base}>{itemData.assignedTo}</p>
                  </div>
                </div>
                {itemData.location && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Ubicación</p>
                      <p className={typography.body.base}>{itemData.location}</p>
                    </div>
                  </div>
                )}
                {itemData.supplier && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Proveedor</p>
                      <p className={typography.body.base}>{itemData.supplier}</p>
                    </div>
                  </div>
                )}
                {itemData.lastRestocked && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Última Reposición</p>
                      <p className={typography.body.base}>
                        {new Date(itemData.lastRestocked).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Notas y Comentarios */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Notas y Comentarios</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            <Textarea
              placeholder="Añadir una nota sobre la pieza..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="min-h-24 resize-y"
            />
            <Button
              onClick={handleSaveNote}
              variant="default"
              className="btn-black"
              disabled={!note.trim()}
            >
              Guardar Nota
            </Button>
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
}

