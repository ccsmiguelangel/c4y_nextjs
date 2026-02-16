"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import { 
  ArrowLeft, 
  MoreVertical, 
  Edit,
  Trash2,
  DollarSign,
  Settings,
  Wrench,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components_shadcn/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components_shadcn/ui/alert-dialog";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { toast } from "@/lib/toast";
import type { ServiceCard, ServiceCoverage } from "@/validations/types";

export default function AdmServicesDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  
  const [service, setService] = useState<ServiceCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    coverage: "cliente" as ServiceCoverage,
    description: "",
    category: "",
  });

  const loadService = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/services/${serviceId}`, { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 404) {
          setService(null);
          return;
        }
        throw new Error("Service request failed");
      }
      const { data } = (await response.json()) as { data?: ServiceCard };
      setService(data || null);
      if (data) {
        setFormData({
          name: data.name,
          price: data.isFree ? "" : String(data.price),
          coverage: data.coverage,
          description: data.description || "",
          category: data.category || "",
        });
      }
    } catch (error) {
      console.error("Error loading service:", error);
      toast.error("No pudimos cargar el servicio. Intenta nuevamente.");
      setService(null);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  const backButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className="h-10 w-10 flex items-center justify-center rounded-full"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );

  const handleSaveChanges = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del servicio es requerido.");
      return;
    }

    const price = parseFloat(formData.price) || 0;
    if (price < 0) {
      toast.error("El precio no puede ser negativo.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            name: formData.name.trim(),
            price,
            coverage: formData.coverage,
            description: formData.description.trim() || undefined,
            category: formData.category.trim() || undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo actualizar el servicio");
      }

      toast.success("Servicio actualizado exitosamente");
      setIsEditing(false);
      await loadService();
    } catch (error) {
      console.error("Error updating service:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el servicio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo eliminar el servicio");
      }

      toast.success("Servicio eliminado exitosamente");
      router.push("/adm-services");
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el servicio");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Cargando..." showFilterAction leftActions={backButton}>
        <section className={`flex flex-col ${spacing.gap.large}`}>
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardHeader className="px-6 pt-6 pb-4">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-6 pb-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </section>
      </AdminLayout>
    );
  }

  if (!service) {
    return (
      <AdminLayout title="Servicio no encontrado" showFilterAction leftActions={backButton}>
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px]`}>
          <p className={typography.body.large}>El servicio solicitado no existe.</p>
          <Button onClick={() => router.push("/adm-services")}>
            Volver a Servicios
          </Button>
        </section>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={service.name} showFilterAction leftActions={backButton}>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Información del Servicio */}
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
                    Editar Servicio
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    variant="destructive" 
                    className="cursor-pointer"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Eliminar Servicio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Icono */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mt-8">
              <Wrench className="h-6 w-6" />
            </div>

            {/* Nombre y Badge */}
            <div className="flex flex-col items-center text-center">
              <h2 className={`${typography.h3} text-center`}>
                {service.name}
              </h2>
              {service.category && (
                <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                  {service.category}
                </p>
              )}
              <div className="mt-2">
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${
                  service.isFree ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {service.coverageLabel}
                </Badge>
              </div>
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
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-5 w-5 flex-shrink-0" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información Detallada */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Detalles del Servicio</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {isEditing ? (
              <>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="name">Nombre del Servicio</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Cambio de Aceite"
                    disabled={isSaving}
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="price">Precio (USD)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="pl-7"
                      placeholder="80.00"
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="coverage">Cobertura del coste</Label>
                  <Select 
                    value={formData.coverage} 
                    onValueChange={(value: ServiceCoverage) => setFormData({ ...formData, coverage: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="coverage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Pagado por el cliente</SelectItem>
                      <SelectItem value="empresa">Cubierto por la empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Mantenimiento"
                    disabled={isSaving}
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descripción del servicio..."
                    disabled={isSaving}
                  />
                </div>
                <div className={`flex flex-col sm:flex-row ${spacing.gap.small} mt-2`}>
                  <Button
                    variant="default"
                    size="lg"
                    className="flex-1 min-h-[44px]"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 min-h-[44px]"
                    onClick={() => {
                      setIsEditing(false);
                      if (service) {
                        setFormData({
                          name: service.name,
                          price: service.isFree ? "" : String(service.price),
                          coverage: service.coverage,
                          description: service.description || "",
                          category: service.category || "",
                        });
                      }
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Precio</p>
                    <p className={`${typography.body.large} font-semibold ${
                      service.isFree ? "text-green-600" : ""
                    }`}>
                      {service.priceLabel}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Cobertura</p>
                    <p className={typography.body.base}>{service.coverageLabel}</p>
                  </div>
                </div>
                {service.category && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Wrench className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Categoría</p>
                      <p className={typography.body.base}>{service.category}</p>
                    </div>
                  </div>
                )}
                {service.description && (
                  <div className={`flex items-start ${spacing.gap.medium} pt-2`}>
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Descripción</p>
                      <p className={typography.body.base}>{service.description}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el servicio 
              <strong> {service.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
