"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import { Separator } from "@/components_shadcn/ui/separator";
import { ScrollArea } from "@/components_shadcn/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components_shadcn/ui/dropdown-menu";
import { Search, MoreVertical, ChevronDown, Plus, Car, X, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { commonClasses, spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import Image from "next/image";
import type { FleetVehicleCard, FleetVehicleStatus } from "@/validations/types";

const getStatusBadge = (status: FleetVehicleStatus) => {
  switch (status) {
    case "nuevo":
      return (
        <Badge className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
          Nuevo
        </Badge>
      );
    case "usado":
      return (
        <Badge className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
          Usado
        </Badge>
      );
    case "seminuevo":
      return (
        <Badge className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
          Seminuevo
        </Badge>
      );
  }
};

const statuses: FleetVehicleStatus[] = ["nuevo", "usado", "seminuevo"];

export default function FleetPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<FleetVehicleCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<FleetVehicleStatus | null>(null);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/fleet", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Fleet request failed");
      }
      const { data } = (await response.json()) as { data?: FleetVehicleCard[] };
      setVehicles(Array.isArray(data) ? data : []);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error loading fleet:", error);
      setErrorMessage("No pudimos cargar la flota. Intenta nuevamente.");
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const brands = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.brand))).sort(),
    [vehicles]
  );
  const models = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.model))).sort(),
    [vehicles]
  );
  const years = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.year))).sort((a, b) => b - a),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = !selectedBrand || vehicle.brand === selectedBrand;
      const matchesModel = !selectedModel || vehicle.model === selectedModel;
      const matchesYear = !selectedYear || vehicle.year === selectedYear;
      const matchesStatus = !selectedStatus || vehicle.status === selectedStatus;
      return matchesSearch && matchesBrand && matchesModel && matchesYear && matchesStatus;
    });
  }, [vehicles, searchQuery, selectedBrand, selectedModel, selectedYear, selectedStatus]);

  const clearFilters = () => {
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setSelectedStatus(null);
  };

  const hasActiveFilters = selectedBrand || selectedModel || selectedYear || selectedStatus;

  return (
    <AdminLayout title="Flota" showFilterAction>
      {/* Search Bar */}
      <section className={`flex flex-col ${spacing.gap.base}`}>
        <label className="flex flex-col min-w-40 h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-muted">
            <div className="text-muted-foreground flex items-center justify-center pl-4">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="text"
              suppressHydrationWarning
              className="flex w-full min-w-0 flex-1 border-none bg-muted focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:ring-0 focus:outline-none h-full rounded-l-none border-l-0 pl-2 text-base placeholder:text-muted-foreground"
              placeholder="Buscar por nombre, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </label>

        {/* Filtros */}
        <ScrollArea className="w-full whitespace-nowrap">
          <nav className={`flex ${spacing.gap.small} py-2`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedBrand ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Marca</span>
                  {selectedBrand && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0">{selectedBrand}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Marca</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedBrand(null)}>
                  Todas las marcas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {brands.map((brand) => (
                  <DropdownMenuItem
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    {brand}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedModel ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Modelo</span>
                  {selectedModel && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0">{selectedModel}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Modelo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedModel(null)}>
                  Todos los modelos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {models.map((model) => (
                  <DropdownMenuItem
                    key={model}
                    onClick={() => setSelectedModel(model)}
                  >
                    {model}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedYear ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Año</span>
                  {selectedYear && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0">{selectedYear}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Año</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedYear(null)}>
                  Todos los años
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {years.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedStatus ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Estado</span>
                  {selectedStatus && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0 capitalize">{selectedStatus}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedStatus(null)}>
                  Todos los estados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {statuses.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                  >
                    <span className="capitalize">{status}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none hover:bg-muted/80"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 shrink-0" />
                <span className={typography.body.base}>Limpiar</span>
              </Button>
            )}
          </nav>
        </ScrollArea>
      </section>

      <Separator />

      {/* Lista de Vehículos */}
      {isLoading ? (
        <Card className={commonClasses.card}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className={`${typography.body.large} font-semibold`}>Cargando flota...</p>
            <p className={typography.body.small}>Esto tomará solo unos segundos.</p>
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className={commonClasses.card}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <p className={`${typography.h3} text-destructive`}>No pudimos cargar la flota</p>
            <p className={typography.body.small}>{errorMessage}</p>
            <Button onClick={loadVehicles} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : filteredVehicles.length > 0 ? (
        <div className={`flex flex-col ${spacing.gap.medium}`}>
          {filteredVehicles.map((vehicle) => (
            <Card 
              key={vehicle.id} 
              className={`${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
              onClick={() => router.push(`/fleet/details/${vehicle.id}`)}
            >
              <CardContent className={`flex items-start ${spacing.gap.medium} ${spacing.card.padding}`}>
                {vehicle.imageUrl ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-28">
                    <Image
                      src={vehicle.imageUrl}
                      alt={vehicle.imageAlt || vehicle.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, 112px"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted sm:h-28 sm:w-28">
                    <Car className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className={`flex flex-1 flex-col ${spacing.gap.small}`}>
                  <div className="flex items-center justify-between">
                    <p className={`${typography.body.large} font-bold leading-tight`}>
                      {vehicle.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground flex items-center justify-center"
                          >
                            <MoreVertical className="h-5 w-5" />
                            <span className="sr-only">Más opciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/fleet/details/${vehicle.id}`); }}>
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <p className={`${typography.body.base} text-muted-foreground leading-normal`}>
                    VIN: {vehicle.vin}
                  </p>
                  <p className={`${typography.body.base} font-semibold leading-normal`}>
                    {vehicle.priceLabel}
                  </p>
                  <div className="pt-1">{getStatusBadge(vehicle.status)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={commonClasses.card}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Car className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className={`mt-4 ${typography.h3} text-foreground`}>
              No se encontraron vehículos
            </h3>
            <p className={`mt-1 ${typography.body.small}`}>
              Prueba a cambiar los filtros o añade un nuevo vehículo al inventario.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Añadir vehículo</span>
      </Button>
    </AdminLayout>
  );
}
