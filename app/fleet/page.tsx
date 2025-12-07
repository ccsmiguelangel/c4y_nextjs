"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Separator } from "@/components_shadcn/ui/separator";
import { ScrollArea } from "@/components_shadcn/ui/scroll-area";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components_shadcn/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components_shadcn/ui/dropdown-menu";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
import { Search, MoreVertical, ChevronDown, Plus, Car, X, ChevronRight, Upload, ChevronLeft } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { commonClasses, spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import Image from "next/image";
import type { FleetVehicleCard, FleetVehicleCondition } from "@/validations/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const getConditionBadge = (status: FleetVehicleCondition) => {
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

const conditions: FleetVehicleCondition[] = ["nuevo", "usado", "seminuevo"];

export default function FleetPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<FleetVehicleCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skeletonCount, setSkeletonCount] = useState(3);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<FleetVehicleCondition | null>(null);
  
  // Estados para paginación
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para el diálogo de agregar vehículo
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    vin: "",
    price: "",
    condition: "nuevo" as FleetVehicleCondition,
    brand: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    fuelType: "",
    transmission: "",
    imageAlt: "",
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Estados para el diálogo de eliminar vehículo
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<FleetVehicleCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Calcular cantidad de skeletons según el tamaño de la pantalla
  useEffect(() => {
    const calculateSkeletonCount = () => {
      if (typeof window === "undefined") return;
      
      // Altura aproximada de cada tarjeta (incluyendo gap): ~120px en mobile, ~140px en desktop
      const cardHeight = window.innerWidth < 640 ? 120 : 140;
      const gap = 12; // spacing.gap.medium = 12px (gap-3)
      
      // Altura disponible aproximada (viewport height menos header, search, filtros, separadores)
      // Header: ~64px, Search: ~48px, Filtros: ~48px, Separador: ~1px, Padding: ~32px
      const reservedHeight = 64 + 48 + 48 + 1 + 32;
      const availableHeight = window.innerHeight - reservedHeight;
      
      // Calcular cuántas tarjetas caben
      const count = Math.max(Math.floor(availableHeight / (cardHeight + gap)), 3);
      setSkeletonCount(Math.min(count, 10)); // Máximo 10 skeletons
    };

    calculateSkeletonCount();
    window.addEventListener("resize", calculateSkeletonCount);
    return () => window.removeEventListener("resize", calculateSkeletonCount);
  }, []);

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
      const matchesCondition = !selectedCondition || vehicle.condition === selectedCondition;
      return matchesSearch && matchesBrand && matchesModel && matchesYear && matchesCondition;
    });
  }, [vehicles, searchQuery, selectedBrand, selectedModel, selectedYear, selectedCondition]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredVehicles.slice(startIndex, endIndex);
  }, [filteredVehicles, currentPage, itemsPerPage]);

  // Resetear a página 1 cuando cambian los filtros o itemsPerPage
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBrand, selectedModel, selectedYear, selectedCondition, itemsPerPage]);


  const clearFilters = () => {
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setSelectedCondition(null);
  };

  const hasActiveFilters = selectedBrand || selectedModel || selectedYear || selectedCondition;

  // Validar si todos los campos requeridos están llenos
  const isFormValid = useMemo(() => {
    const year = Number(formData.year);
    const price = Number(formData.price);
    
    return (
      formData.name.trim() !== "" &&
      formData.vin.trim() !== "" &&
      formData.brand.trim() !== "" &&
      formData.model.trim() !== "" &&
      formData.year.trim() !== "" &&
      !isNaN(year) &&
      year >= 1900 &&
      year <= 2100 &&
      formData.price.trim() !== "" &&
      !isNaN(price) &&
      price > 0 &&
      formData.condition !== null &&
      formData.condition !== undefined
    );
  }, [formData]);

  const resetForm = () => {
    setFormData({
      name: "",
      vin: "",
      price: "",
      condition: "nuevo",
      brand: "",
      model: "",
      year: "",
      color: "",
      mileage: "",
      fuelType: "",
      transmission: "",
      imageAlt: "",
    });
    setSelectedImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    setIsDeleting(true);
    try {
      const targetId = vehicleToDelete.documentId ?? vehicleToDelete.id;
      const response = await fetch(`/api/fleet/${targetId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("delete_failed");
      }
      toast.success("Vehículo eliminado exitosamente");
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
      await loadVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("No pudimos eliminar el vehículo. Intenta nuevamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateVehicle = async (vehicle: FleetVehicleCard) => {
    try {
      // Obtener los datos raw del vehículo para acceder al imageId
      const targetId = vehicle.documentId ?? vehicle.id;
      
      // Hacer una llamada a la API para obtener los datos raw con la imagen
      const vehicleResponse = await fetch(`/api/fleet/${targetId}?includeRaw=true`);
      if (!vehicleResponse.ok) {
        throw new Error("No se pudo obtener los datos del vehículo");
      }
      const vehicleData = (await vehicleResponse.json()) as { data?: any };
      
      // Generar un nuevo VIN único agregando un sufijo
      const timestamp = Date.now().toString().slice(-4);
      const newVin = `${vehicle.vin}-COPY-${timestamp}`;
      
      // Extraer el imageId del vehículo original si existe
      // La estructura puede ser: attributes.image.data.id o image.data.id dependiendo de cómo Strapi devuelva los datos
      let imageId: number | null = null;
      const rawData = vehicleData.data;
      if (rawData) {
        const attributes = rawData.attributes || rawData;
        const imageData = attributes.image;
        if (imageData) {
          if (imageData.data?.id) {
            imageId = imageData.data.id;
          } else if (imageData.id) {
            imageId = imageData.id;
          } else if (typeof imageData === 'number') {
            imageId = imageData;
          }
        }
      }
      
      // Crear el payload con los datos del vehículo original
      const payload = {
        name: `${vehicle.name} (Copia)`,
        vin: newVin,
        price: vehicle.priceNumber, // Usar priceNumber en lugar de price
        condition: vehicle.condition,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || null,
        mileage: vehicle.mileage !== undefined ? vehicle.mileage : null,
        fuelType: vehicle.fuelType || null,
        transmission: vehicle.transmission || null,
        image: imageId,
        imageAlt: vehicle.imageAlt || null,
      };

      const response = await fetch("/api/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData?.error || "No se pudo duplicar el vehículo");
      }

      toast.success("Vehículo duplicado exitosamente");
      await loadVehicles();
    } catch (error) {
      console.error("Error duplicating vehicle:", error);
      const errorMessage = error instanceof Error ? error.message : "No pudimos duplicar el vehículo. Intenta nuevamente.";
      toast.error(errorMessage);
    }
  };

  const handleCreateVehicle = async () => {
    // Validar campos requeridos
    if (!formData.name || !formData.vin || !formData.price || !formData.brand || !formData.model || !formData.year) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // Validar año
    const year = Number(formData.year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      toast.error("El año debe estar entre 1900 y 2100");
      return;
    }

    // Validar precio
    const price = Number(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error("El precio debe ser un número válido mayor a 0");
      return;
    }

    // Validar mileage si está presente
    if (formData.mileage && (isNaN(Number(formData.mileage)) || Number(formData.mileage) < 0)) {
      toast.error("El kilometraje debe ser un número válido mayor o igual a 0");
      return;
    }

    setIsCreating(true);
    try {
      let uploadedImageId: number | null = null;
      
      // Subir imagen si hay una seleccionada
      if (selectedImageFile) {
        const uploadForm = new FormData();
        uploadForm.append("files", selectedImageFile);
        const uploadResponse = await fetch("/api/strapi/upload", {
          method: "POST",
          body: uploadForm,
        });
        if (!uploadResponse.ok) {
          throw new Error("No se pudo subir la imagen");
        }
        const uploadPayload = (await uploadResponse.json()) as { data?: { id?: number } };
        uploadedImageId = uploadPayload?.data?.id ?? null;
      }

      const payload = {
        name: formData.name,
        vin: formData.vin,
        price: price,
        condition: formData.condition,
        brand: formData.brand,
        model: formData.model,
        year: year,
        color: formData.color || null,
        mileage: formData.mileage ? Number(formData.mileage) : null,
        fuelType: formData.fuelType || null,
        transmission: formData.transmission || null,
        image: uploadedImageId,
        imageAlt: formData.imageAlt || null,
      };

      const response = await fetch("/api/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo crear el vehículo");
      }

      const { data } = (await response.json()) as { data: FleetVehicleCard };
      toast.success("Vehículo creado exitosamente");
      setIsDialogOpen(false);
      resetForm();
      await loadVehicles();
      // Navegar al detalle del vehículo creado
      router.push(`/fleet/details/${data.documentId ?? data.id}`);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo crear el vehículo");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AdminLayout title="Flota" showFilterAction>
      {/* Search Bar */}
      <section className={`flex flex-col ${spacing.gap.base}`} suppressHydrationWarning>
        <label className="flex flex-col min-w-40 h-12 w-full" suppressHydrationWarning>
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
                    selectedCondition ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Estado</span>
                  {selectedCondition && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0 capitalize">{selectedCondition}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedCondition(null)}>
                  Todos los estados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {conditions.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setSelectedCondition(status)}
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

            {/* Selector de items por página */}
            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="items-per-page" className={cn(typography.body.small, "text-muted-foreground whitespace-nowrap")}>
                Mostrar:
              </Label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger id="items-per-page" className="h-8 w-20 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </nav>
        </ScrollArea>
      </section>

      <Separator />

      {/* Lista de Vehículos */}
      {isLoading ? (
        <div className={`flex flex-col ${spacing.gap.medium}`}>
          {[...Array(skeletonCount)].map((_, index) => (
            <Card key={index} className={commonClasses.card}>
              <CardContent className={`flex items-start ${spacing.gap.medium} ${spacing.card.padding}`}>
                <Skeleton className="h-24 w-24 shrink-0 rounded-lg sm:h-28 sm:w-28" />
                <div className={`flex flex-1 flex-col ${spacing.gap.small}`}>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-48" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <Skeleton className="h-5 w-5 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
        <>
          <div className={`flex flex-col ${spacing.gap.medium}`}>
            {paginatedVehicles.map((vehicle) => (
            <Card 
              key={vehicle.id} 
              className={`${commonClasses.card} bg-background/90 backdrop-blur-sm cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
              onClick={() => router.push(`/fleet/details/${vehicle.documentId ?? vehicle.id}`)}
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
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/fleet/details/${vehicle.documentId ?? vehicle.id}`);
                            }}
                          >
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/fleet/details/${vehicle.documentId ?? vehicle.id}?edit=true`);
                            }}
                          >
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateVehicle(vehicle);
                            }}
                          >
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVehicleToDelete(vehicle);
                              setDeleteDialogOpen(true);
                            }}
                          >
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
                  <div className="pt-1">{getConditionBadge(vehicle.condition)}</div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <p className={cn(typography.body.small, "text-muted-foreground")}>
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredVehicles.length)} de {filteredVehicles.length} vehículos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Anterior</span>
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Siguiente</span>
                </Button>
              </div>
            </div>
          )}
        </>
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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 z-50"
        size="icon"
        onClick={() => setIsDialogOpen(true)}
        aria-label="Agregar nuevo vehículo"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog para agregar vehículo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl h-[90vh] p-0 !flex !flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className={typography.h2}>Agregar Nuevo Vehículo</DialogTitle>
            <DialogDescription>
              Completa todos los campos requeridos para agregar un nuevo vehículo a la flota.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollAreaPrimitive.Root className="relative flex-1 min-h-0 overflow-hidden">
            <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
              <div className="px-6">
                <div className={`flex flex-col ${spacing.gap.medium} py-6`}>
                  {/* Información Básica */}
                  <div className={`flex flex-col ${spacing.gap.base}`}>
                    <h3 className={typography.h4}>Información Básica</h3>
                    
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="name" className={typography.label}>
                        Nombre del Vehículo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Ford Mustang 2023"
                        className="rounded-lg"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vin" className={typography.label}>
                        VIN <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="vin"
                        value={formData.vin}
                        onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                        placeholder="Ej: 1ZVBP8CM0D5281234"
                        className="rounded-lg"
                        maxLength={17}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="brand" className={typography.label}>
                          Marca <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          placeholder="Ej: Ford"
                          className="rounded-lg"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="model" className={typography.label}>
                          Modelo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                          placeholder="Ej: Mustang"
                          className="rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="year" className={typography.label}>
                          Año <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="year"
                          type="number"
                          value={formData.year}
                          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                          placeholder="Ej: 2023"
                          className="rounded-lg"
                          min={1900}
                          max={2100}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="condition" className={typography.label}>
                          Estado <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(value) => setFormData({ ...formData, condition: value as FleetVehicleCondition })}
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent className="z-[200]">
                            {conditions.map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                <span className="capitalize">{condition}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Precio */}
                  <div className={`flex flex-col ${spacing.gap.base}`}>
                    <h3 className={typography.h4}>Precio</h3>
                    
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="price" className={typography.label}>
                        Precio <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Ej: 55000"
                        className="rounded-lg"
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Detalles Adicionales */}
                  <div className={`flex flex-col ${spacing.gap.base}`}>
                    <h3 className={typography.h4}>Detalles Adicionales</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="color" className={typography.label}>
                          Color
                        </Label>
                        <Input
                          id="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          placeholder="Ej: Plata Metálico"
                          className="rounded-lg"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="mileage" className={typography.label}>
                          Kilometraje
                        </Label>
                        <Input
                          id="mileage"
                          type="number"
                          value={formData.mileage}
                          onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                          placeholder="Ej: 35000"
                          className="rounded-lg"
                          min={0}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="fuelType" className={typography.label}>
                          Tipo de Combustible
                        </Label>
                        <Input
                          id="fuelType"
                          value={formData.fuelType}
                          onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                          placeholder="Ej: Gasolina, Híbrido, Eléctrico"
                          className="rounded-lg"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="transmission" className={typography.label}>
                          Transmisión
                        </Label>
                        <Input
                          id="transmission"
                          value={formData.transmission}
                          onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                          placeholder="Ej: Automática, Manual, CVT"
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Imagen */}
                  <div className={`flex flex-col ${spacing.gap.base}`}>
                    <h3 className={typography.h4}>Imagen</h3>
                    
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="image" className={typography.label}>
                        Imagen del Vehículo
                      </Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <Label
                          htmlFor="image"
                          className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          <span className={typography.body.base}>Subir imagen</span>
                        </Label>
                        {imagePreview && (
                          <div className="relative h-20 w-20 rounded-lg overflow-hidden border">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="imageAlt" className={typography.label}>
                        Texto Alternativo de la Imagen
                      </Label>
                      <Input
                        id="imageAlt"
                        value={formData.imageAlt}
                        onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })}
                        placeholder="Descripción de la imagen para accesibilidad"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.ScrollAreaScrollbar
              orientation="vertical"
              className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
            >
              <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
            </ScrollAreaPrimitive.ScrollAreaScrollbar>
            <ScrollAreaPrimitive.Corner />
          </ScrollAreaPrimitive.Root>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateVehicle}
              disabled={isCreating || !isFormValid}
              className={cn(
                "font-semibold shadow-md hover:shadow-lg transition-all duration-200",
                !isCreating && isFormValid && "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 !opacity-100",
                (isCreating || !isFormValid) && "!opacity-50 cursor-not-allowed"
              )}
            >
              {isCreating ? "Creando..." : "Crear Vehículo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar vehículo */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClose={() => setDeleteDialogOpen(false)}>
          <AlertDialogHeader>
            <AlertDialogTitle>{vehicleToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar este vehículo? Esta acción eliminará el vehículo de la flota y no se podrá deshacer. Confirma si deseas continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
