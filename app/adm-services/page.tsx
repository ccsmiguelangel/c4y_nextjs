"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components_shadcn/ui/select";
import { Plus, Wrench, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import type { ServiceCard, ServiceCoverage } from "@/validations/types";

export default function AdmServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCoverage, setServiceCoverage] = useState<ServiceCoverage>("cliente");

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/services", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Services request failed");
      }
      const { data } = (await response.json()) as { data?: ServiceCard[] };
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading services:", error);
      toast.error("No pudimos cargar los servicios. Intenta nuevamente.");
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleAddService = async () => {
    if (!serviceName.trim()) {
      toast.error("El nombre del servicio es requerido.");
      return;
    }

    const price = parseFloat(servicePrice) || 0;
    if (price < 0) {
      toast.error("El precio no puede ser negativo.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            name: serviceName.trim(),
            price,
            coverage: serviceCoverage,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo crear el servicio");
      }

      toast.success("Servicio creado exitosamente");
      setServiceName("");
      setServicePrice("");
      setServiceCoverage("cliente");
      await loadServices();
    } catch (error) {
      console.error("Error creating service:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo crear el servicio");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AdminLayout
      title="Gestión de Servicios"
      showFilterAction
    >
        {/* Sección: Servicios */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className={spacing.card.header}>
            <CardTitle className="text-base font-semibold">Servicios</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} ${spacing.card.content}`}>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="shadow-sm ring-1 ring-inset ring-border/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : services.length === 0 ? (
              <p className={`${typography.body.base} text-muted-foreground text-center py-8`}>
                No hay servicios registrados. Añade uno nuevo.
              </p>
            ) : (
              services.map((service) => (
                <Card 
                  key={service.id} 
                  className="shadow-sm ring-1 ring-inset ring-border/50 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                  onClick={() => router.push(`/adm-services/details/${service.documentId}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <p className={typography.body.base}>{service.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`${typography.body.base} font-semibold ${
                            service.isFree ? "text-green-600" : ""
                          }`}
                        >
                          {service.priceLabel}
                        </p>
                        <p className={`text-xs ${
                          service.isFree ? "text-green-600" : "text-muted-foreground"
                        }`}>
                          {service.coverageLabel}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sección: Añadir Nuevo Servicio */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className={spacing.card.header}>
            <CardTitle className="text-base font-semibold">
              Añadir Nuevo Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.medium} ${spacing.card.content}`}>
            <div className={`flex flex-col ${spacing.gap.small}`}>
              <Label htmlFor="service-name">Nombre del Servicio</Label>
              <Input
                id="service-name"
                name="service-name"
                placeholder="Ej. Alineación y Balanceo"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className={`flex flex-col ${spacing.gap.small}`}>
              <Label htmlFor="service-price">Precio (USD)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="service-price"
                  name="service-price"
                  placeholder="0.00"
                  className="pl-7 pr-12"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  disabled={isCreating}
                  type="number"
                  min="0"
                  step="0.01"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
                  USD
                </span>
              </div>
            </div>

            <div className={`flex flex-col ${spacing.gap.small}`}>
              <Label htmlFor="service-coverage">Cobertura del coste</Label>
              <Select 
                value={serviceCoverage} 
                onValueChange={(value: ServiceCoverage) => setServiceCoverage(value)}
                disabled={isCreating}
              >
                <SelectTrigger id="service-coverage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">
                    Pagado por el cliente
                  </SelectItem>
                  <SelectItem value="empresa">
                    Cubierto por la empresa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="default"
              className="btn-black flex items-center justify-center"
              onClick={handleAddService}
              disabled={isCreating || !serviceName.trim()}
            >
              {isCreating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              {isCreating ? "Añadiendo..." : "Añadir Servicio"}
            </Button>
          </CardContent>
        </Card>
    </AdminLayout>
  );
}
