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
import { MultiSelectCombobox } from "@/components_shadcn/ui/multi-select-combobox";
import { Calendar as CalendarComponent } from "@/components_shadcn/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components_shadcn/ui/popover";
import { Checkbox } from "@/components_shadcn/ui/checkbox";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { es as dayPickerEs } from "react-day-picker/locale";
import { Search, MoreVertical, ChevronDown, Plus, Car, X, ChevronRight, Upload, ChevronLeft, Calendar, List, Grid3x3, Table, LayoutGrid, CheckSquare, Square, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components_shadcn/ui/sheet";
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
  const [selectedResponsable, setSelectedResponsable] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  
  // Estados para paginación
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para vista y filtros
  const [viewMode, setViewMode] = useState<"list" | "grid" | "table">("list");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
  // Estados para selección múltiple
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
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
    placa: "",
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Estados para los nuevos campos
  const [stockQuantity, setStockQuantity] = useState("");
  const [maintenanceScheduledDate, setMaintenanceScheduledDate] = useState("");
  const [maintenanceScheduledTime, setMaintenanceScheduledTime] = useState("");
  const [maintenanceIsAllDay, setMaintenanceIsAllDay] = useState(false);
  const [maintenanceRecurrencePattern, setMaintenanceRecurrencePattern] = useState<"daily" | "weekly" | "biweekly" | "monthly" | "yearly">("monthly");
  const [maintenanceRecurrenceEndDate, setMaintenanceRecurrenceEndDate] = useState("");
  const [selectedResponsables, setSelectedResponsables] = useState<number[]>([]);
  const [selectedAssignedDrivers, setSelectedAssignedDrivers] = useState<number[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; documentId?: string; displayName?: string; email?: string; avatar?: { url?: string; alternativeText?: string } }>>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Estados para el diálogo de eliminar vehículo
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<FleetVehicleCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estados para el diálogo de eliminar múltiples vehículos
  const [deleteMultipleDialogOpen, setDeleteMultipleDialogOpen] = useState(false);

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

  // Cargar usuarios disponibles cuando se abre el modal
  const loadAvailableUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`/api/user-profiles`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No pudimos obtener los usuarios");
      }
      const { data } = (await response.json()) as { data: Array<{ id: number; documentId?: string; displayName?: string; email?: string; avatar?: { url?: string; alternativeText?: string } }> };
      setAvailableUsers(data || []);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      loadAvailableUsers();
    }
  }, [isDialogOpen, loadAvailableUsers]);

  // Cargar usuarios cuando se abre el sheet de filtros
  useEffect(() => {
    if (isFilterSheetOpen) {
      loadAvailableUsers();
    }
  }, [isFilterSheetOpen, loadAvailableUsers]);

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
      const matchesResponsable = !selectedResponsable || 
        (vehicle.responsables && vehicle.responsables.some(r => r.id === selectedResponsable || Number(r.id) === Number(selectedResponsable)));
      const matchesDriver = !selectedDriver || 
        (vehicle.assignedDrivers && vehicle.assignedDrivers.some(d => d.id === selectedDriver || Number(d.id) === Number(selectedDriver)));
      return matchesSearch && matchesBrand && matchesModel && matchesYear && matchesCondition && matchesResponsable && matchesDriver;
    });
  }, [vehicles, searchQuery, selectedBrand, selectedModel, selectedYear, selectedCondition, selectedResponsable, selectedDriver]);

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
  }, [searchQuery, selectedBrand, selectedModel, selectedYear, selectedCondition, selectedResponsable, selectedDriver, itemsPerPage]);


  const clearFilters = () => {
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setSelectedCondition(null);
    setSelectedResponsable(null);
    setSelectedDriver(null);
  };

  const hasActiveFilters = selectedBrand || selectedModel || selectedYear || selectedCondition || selectedResponsable || selectedDriver;

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
      placa: "",
    });
    setSelectedImageFile(null);
    setImagePreview(null);
    setStockQuantity("");
    setMaintenanceScheduledDate("");
    setMaintenanceScheduledTime("");
    setMaintenanceIsAllDay(false);
    setMaintenanceRecurrencePattern("monthly");
    setMaintenanceRecurrenceEndDate("");
    setSelectedResponsables([]);
    setSelectedAssignedDrivers([]);
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

  const handleToggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedVehicles.size === paginatedVehicles.length) {
      setSelectedVehicles(new Set());
    } else {
      setSelectedVehicles(new Set(paginatedVehicles.map(v => v.documentId ?? v.id)));
    }
  };

  const handleDeleteMultiple = () => {
    if (selectedVehicles.size === 0) return;
    setDeleteMultipleDialogOpen(true);
  };

  const handleConfirmDeleteMultiple = async () => {
    if (selectedVehicles.size === 0) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedVehicles).map(async (vehicleId) => {
        const response = await fetch(`/api/fleet/${vehicleId}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(`Error eliminando vehículo ${vehicleId}`);
        }
        return vehicleId;
      });

      await Promise.all(deletePromises);
      toast.success(`${selectedVehicles.size} vehículo(s) eliminado(s) exitosamente`);
      setSelectedVehicles(new Set());
      setIsSelectMode(false);
      setDeleteMultipleDialogOpen(false);
      await loadVehicles();
    } catch (error) {
      console.error("Error deleting vehicles:", error);
      toast.error("No pudimos eliminar algunos vehículos. Intenta nuevamente.");
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
        // Validar tipo de archivo
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(selectedImageFile.type)) {
          throw new Error(`Tipo de archivo no válido. Solo se permiten imágenes: ${validImageTypes.join(', ')}`);
        }
        
        // Validar tamaño (máximo 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB en bytes
        if (selectedImageFile.size > maxSize) {
          throw new Error(`La imagen es demasiado grande. El tamaño máximo permitido es 10MB.`);
        }
        
        const uploadForm = new FormData();
        uploadForm.append("files", selectedImageFile);
        const uploadResponse = await fetch("/api/strapi/upload", {
          method: "POST",
          body: uploadForm,
        });
        if (!uploadResponse.ok) {
          let errorMessage = "No se pudo subir la imagen";
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData?.error || errorMessage;
          } catch {
            // Si no se puede parsear el JSON, usar el mensaje por defecto
          }
          throw new Error(errorMessage);
        }
        const uploadPayload = (await uploadResponse.json()) as { data?: { id?: number } };
        uploadedImageId = uploadPayload?.data?.id ?? null;
        if (!uploadedImageId) {
          throw new Error("No se pudo obtener el ID de la imagen subida");
        }
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
        stockQuantity: stockQuantity ? Number(stockQuantity) : null,
        placa: formData.placa || null,
        nextMaintenanceDate: maintenanceScheduledDate ? (() => {
          const timeToUse = maintenanceIsAllDay ? "00:00" : (maintenanceScheduledTime || "00:00");
          return `${maintenanceScheduledDate}T${timeToUse}:00`;
        })() : null,
        responsables: selectedResponsables.length > 0 ? selectedResponsables : [],
        assignedDrivers: selectedAssignedDrivers.length > 0 ? selectedAssignedDrivers : [],
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
      
      // Sincronizar fecha de mantenimiento con recordatorios si existe
      if (maintenanceScheduledDate && data.documentId) {
        try {
          const maintenanceTitle = "Mantenimiento completo del vehículo";
          const timeToUse = maintenanceIsAllDay ? "00:00" : (maintenanceScheduledTime || "00:00");
          const scheduledDateTime = `${maintenanceScheduledDate}T${timeToUse}:00`;
          
          // Obtener el usuario actual
          const userResponse = await fetch("/api/user-profile/me", { cache: "no-store" });
          if (userResponse.ok) {
            const { data: userData } = (await userResponse.json()) as { data: { documentId?: string } };
            
            if (userData?.documentId) {
              // Asignar a responsables y conductores si existen
              const assignedUserIds = [
                ...selectedResponsables,
                ...selectedAssignedDrivers,
              ].filter((id, index, self) => self.indexOf(id) === index); // Eliminar duplicados
              
              const createData: any = {
                title: maintenanceTitle,
                description: `Mantenimiento completo programado para el vehículo ${formData.name}`,
                reminderType: "recurring",
                scheduledDate: scheduledDateTime,
                isAllDay: maintenanceIsAllDay,
                recurrencePattern: maintenanceRecurrencePattern,
                assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : undefined,
                authorDocumentId: userData.documentId,
              };
              
              if (maintenanceRecurrenceEndDate) {
                createData.recurrenceEndDate = `${maintenanceRecurrenceEndDate}T00:00:00`;
              }
              
              await fetch(`/api/fleet/${data.documentId}/reminder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  data: createData,
                }),
              });
            }
          }
        } catch (error) {
          console.error("Error creando recordatorio de mantenimiento:", error);
          // No mostrar error al usuario, solo loguear
        }
      }
      
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
    <AdminLayout 
      title="Flota" 
      showFilterAction
      onFilterActionClick={() => setIsFilterSheetOpen(true)}
    >
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

        {/* Selector de Vista y Filtros */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
              aria-label="Vista de lista"
              suppressHydrationWarning
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8"
              aria-label="Vista de cuadrícula"
              suppressHydrationWarning
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8"
              aria-label="Vista de tabla"
              suppressHydrationWarning
            >
              <Table className="h-4 w-4" />
            </Button>
            
            {/* Botón de selección múltiple */}
            <Button
              variant={isSelectMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) {
                  setSelectedVehicles(new Set());
                }
              }}
              className="h-8"
              aria-label="Modo selección"
              suppressHydrationWarning
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón eliminar múltiples */}
            {isSelectMode && selectedVehicles.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteMultiple}
                disabled={isDeleting}
                className="h-8"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar ({selectedVehicles.size})
              </Button>
            )}
            
            {/* Indicador de filtros activos */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                onClick={() => setIsFilterSheetOpen(true)}
              >
                <span className={typography.body.base}>
                  {[selectedBrand, selectedModel, selectedYear, selectedCondition, selectedResponsable, selectedDriver].filter(Boolean).length} filtro(s) activo(s)
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Filtros - Ocultos, ahora en Sheet */}
        {/* Mantenemos solo el selector de items por página visible */}
        <div className="flex items-center justify-end gap-2">
          <Label htmlFor="items-per-page" className={cn(typography.body.small, "text-muted-foreground whitespace-nowrap")}>
            Mostrar:
          </Label>
          <Select 
            value={itemsPerPage.toString()} 
            onValueChange={(value) => setItemsPerPage(Number(value))}
            defaultValue="5"
          >
            <SelectTrigger id="items-per-page" className="h-8 w-20 rounded-lg" suppressHydrationWarning>
              <SelectValue placeholder="5" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sheet de Filtros */}
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetContent side="right" className="w-[500px] sm:w-[640px] overflow-y-auto px-8">
            <SheetHeader className="px-0">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Filtra los vehículos por diferentes criterios
              </SheetDescription>
            </SheetHeader>
            
            <div className={`flex flex-col ${spacing.gap.base} mt-6 px-0`}>
              {/* Filtro de Marca */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label className={typography.label}>Marca</Label>
                <Select value={selectedBrand || "all"} onValueChange={(value) => setSelectedBrand(value === "all" ? null : value)}>
                  <SelectTrigger className="text-right [&>*:first-child]:justify-end">
                    <SelectValue placeholder="Todas las marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-right">Todas las marcas</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand} value={brand} className="text-right">
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Modelo */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label className={typography.label}>Modelo</Label>
                <Select value={selectedModel || "all"} onValueChange={(value) => setSelectedModel(value === "all" ? null : value)}>
                  <SelectTrigger className="text-right [&>*:first-child]:justify-end">
                    <SelectValue placeholder="Todos los modelos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-right">Todos los modelos</SelectItem>
                    {models.map((model) => (
                      <SelectItem key={model} value={model} className="text-right">
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Año */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label className={typography.label}>Año</Label>
                <Select value={selectedYear?.toString() || "all"} onValueChange={(value) => setSelectedYear(value === "all" ? null : Number(value))}>
                  <SelectTrigger className="text-right [&>*:first-child]:justify-end">
                    <SelectValue placeholder="Todos los años" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-right">Todos los años</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-right">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Estado */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label className={typography.label}>Estado</Label>
                <Select value={selectedCondition || "all"} onValueChange={(value) => setSelectedCondition(value === "all" ? null : value as FleetVehicleCondition)}>
                  <SelectTrigger className="text-right [&>*:first-child]:justify-end">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-right">Todos los estados</SelectItem>
                    {conditions.map((status) => (
                      <SelectItem key={status} value={status} className="text-right">
                        <span className="capitalize">{status}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Responsable */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label className={typography.label}>Responsable</Label>
                <Select 
                  value={selectedResponsable?.toString() || "all"} 
                  onValueChange={(value) => setSelectedResponsable(value === "all" ? null : Number(value))}
                >
                  <SelectTrigger className="text-right [&>*:first-child]:justify-end">
                    <SelectValue placeholder="Todos los responsables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-right">Todos los responsables</SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()} className="text-right">
                        {user.displayName || user.email || `Usuario ${user.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Conductor Asignado */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label className={typography.label}>Conductor Asignado</Label>
                <Select 
                  value={selectedDriver?.toString() || "all"} 
                  onValueChange={(value) => setSelectedDriver(value === "all" ? null : Number(value))}
                >
                  <SelectTrigger className="text-right [&>*:first-child]:justify-end">
                    <SelectValue placeholder="Todos los conductores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-right">Todos los conductores</SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()} className="text-right">
                        {user.displayName || user.email || `Usuario ${user.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex-1"
                  disabled={!hasActiveFilters}
                >
                  Limpiar Filtros
                </Button>
                <Button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

      </section>

      <Separator />

      {/* Lista de Vehículos */}
      {isLoading ? (
        <div className={`flex flex-col ${spacing.gap.medium}`}>
          {[...Array(skeletonCount)].map((_, index) => (
            <Card 
              key={index} 
              className="!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg"
              style={{
                backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
                borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
              } as React.CSSProperties}
            >
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
        <Card 
          className="!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
            borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
          } as React.CSSProperties}
        >
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
          {/* Renderizado según el modo de vista */}
          {viewMode === "list" && (
            <div className={`flex flex-col ${spacing.gap.medium}`}>
              {isSelectMode && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8"
                  >
                    {selectedVehicles.size === paginatedVehicles.length ? (
                      <CheckSquare className="h-4 w-4 mr-2" />
                    ) : (
                      <Square className="h-4 w-4 mr-2" />
                    )}
                    Seleccionar todos
                  </Button>
                  {selectedVehicles.size > 0 && (
                    <span className={typography.body.small}>
                      {selectedVehicles.size} seleccionado(s)
                    </span>
                  )}
                </div>
              )}
              {paginatedVehicles.map((vehicle) => {
                const vehicleId = vehicle.documentId ?? vehicle.id;
                const isSelected = selectedVehicles.has(vehicleId);
                return (
                <Card 
                  key={vehicle.id} 
                  className={cn(
                    "!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg transition-colors",
                    isSelectMode ? "cursor-default" : "cursor-pointer hover:opacity-90 active:opacity-80",
                    isSelected && "ring-2 ring-primary"
                  )}
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
                    borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
                  } as React.CSSProperties}
                  onClick={() => {
                    if (isSelectMode) {
                      handleToggleVehicleSelection(vehicleId);
                    } else {
                      router.push(`/fleet/details/${vehicleId}`);
                    }
                  }}
                >
                  <CardContent className={`flex items-start ${spacing.gap.medium} ${spacing.card.padding}`}>
                    {isSelectMode && (
                      <div className="flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleVehicleSelection(vehicleId)}
                          className="h-5 w-5"
                        />
                      </div>
                    )}
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
                          {!isSelectMode && (
                            <>
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
                                      router.push(`/fleet/details/${vehicleId}`);
                                    }}
                                  >
                                    Ver detalles
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/fleet/details/${vehicleId}?edit=true`);
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
                            </>
                          )}
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
              );
              })}
            </div>
          )}

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedVehicles.map((vehicle) => {
                const vehicleId = vehicle.documentId ?? vehicle.id;
                const isSelected = selectedVehicles.has(vehicleId);
                return (
                <Card 
                  key={vehicle.id} 
                  className={cn(
                    "!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg transition-colors flex flex-col",
                    isSelectMode ? "cursor-default" : "cursor-pointer hover:opacity-90 active:opacity-80",
                    isSelected && "ring-2 ring-primary"
                  )}
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
                    borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
                  } as React.CSSProperties}
                  onClick={() => {
                    if (isSelectMode) {
                      handleToggleVehicleSelection(vehicleId);
                    } else {
                      router.push(`/fleet/details/${vehicleId}`);
                    }
                  }}
                >
                  <CardContent className={`flex flex-col ${spacing.gap.small} ${spacing.card.padding} p-4 relative`}>
                    {isSelectMode && (
                      <div className="absolute top-1 right-1 z-20 bg-background/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleVehicleSelection(vehicleId)}
                          className="h-5 w-5"
                        />
                      </div>
                    )}
                    {vehicle.imageUrl ? (
                      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={vehicle.imageUrl}
                          alt={vehicle.imageAlt || vehicle.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
                        <Car className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className={`flex flex-col ${spacing.gap.small}`}>
                      <p className={`${typography.body.large} font-bold leading-tight line-clamp-2`}>
                        {vehicle.name}
                      </p>
                      <p className={`${typography.body.small} text-muted-foreground leading-normal line-clamp-1`}>
                        VIN: {vehicle.vin}
                      </p>
                      <p className={`${typography.body.base} font-semibold leading-normal`}>
                        {vehicle.priceLabel}
                      </p>
                      <div className="pt-1">{getConditionBadge(vehicle.condition)}</div>
                      {!isSelectMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                            >
                              <MoreVertical className="h-4 w-4 mr-2" />
                              Opciones
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/fleet/details/${vehicleId}`);
                              }}
                            >
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/fleet/details/${vehicleId}?edit=true`);
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}

          {viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {isSelectMode && (
                      <th className={`${typography.label} text-left p-4 w-12`}>
                        <Checkbox
                          checked={selectedVehicles.size === paginatedVehicles.length && paginatedVehicles.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="h-4 w-4"
                        />
                      </th>
                    )}
                    <th className={`${typography.label} text-left p-4`}>Imagen</th>
                    <th className={`${typography.label} text-left p-4`}>Nombre</th>
                    <th className={`${typography.label} text-left p-4`}>VIN</th>
                    <th className={`${typography.label} text-left p-4`}>Marca</th>
                    <th className={`${typography.label} text-left p-4`}>Modelo</th>
                    <th className={`${typography.label} text-left p-4`}>Año</th>
                    <th className={`${typography.label} text-left p-4`}>Precio</th>
                    <th className={`${typography.label} text-left p-4`}>Estado</th>
                    {!isSelectMode && (
                      <th className={`${typography.label} text-left p-4`}>Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedVehicles.map((vehicle) => {
                    const vehicleId = vehicle.documentId ?? vehicle.id;
                    const isSelected = selectedVehicles.has(vehicleId);
                    return (
                    <tr 
                      key={vehicle.id}
                      className={cn(
                        "border-b transition-colors",
                        isSelectMode ? "cursor-default" : "cursor-pointer hover:bg-muted/50",
                        isSelected && "bg-primary/5"
                      )}
                      onClick={() => {
                        if (isSelectMode) {
                          handleToggleVehicleSelection(vehicleId);
                        } else {
                          router.push(`/fleet/details/${vehicleId}`);
                        }
                      }}
                    >
                      {isSelectMode && (
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleVehicleSelection(vehicleId)}
                            className="h-4 w-4"
                          />
                        </td>
                      )}
                      <td className="p-4">
                        {vehicle.imageUrl ? (
                          <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={vehicle.imageUrl}
                              alt={vehicle.imageAlt || vehicle.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                            <Car className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className={`p-4 ${typography.body.base} font-medium`}>{vehicle.name}</td>
                      <td className={`p-4 ${typography.body.small} text-muted-foreground`}>{vehicle.vin}</td>
                      <td className={`p-4 ${typography.body.base}`}>{vehicle.brand}</td>
                      <td className={`p-4 ${typography.body.base}`}>{vehicle.model}</td>
                      <td className={`p-4 ${typography.body.base}`}>{vehicle.year}</td>
                      <td className={`p-4 ${typography.body.base} font-semibold`}>{vehicle.priceLabel}</td>
                      <td className="p-4">{getConditionBadge(vehicle.condition)}</td>
                      {!isSelectMode && (
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/fleet/details/${vehicleId}`);
                                }}
                              >
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/fleet/details/${vehicleId}?edit=true`);
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
                        </td>
                      )}
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
        <Card 
          className="!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
            borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
          } as React.CSSProperties}
        >
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

                  {/* Información Adicional */}
                  <div className={`flex flex-col ${spacing.gap.base}`}>
                    <h3 className={typography.h4}>Información Adicional</h3>
                    
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="stockQuantity" className={typography.label}>
                        Cantidad en stock
                      </Label>
                      <Input
                        id="stockQuantity"
                        type="number"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        placeholder="Ej: 10"
                        className="rounded-lg"
                        min={0}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="placa" className={typography.label}>
                        Placa
                      </Label>
                      <Input
                        id="placa"
                        value={formData.placa}
                        onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                        placeholder="Ej: ABC-123"
                        className="rounded-lg"
                      />
                    </div>

                    {/* Mantenimiento Recurrente */}
                    <div className={`flex flex-col ${spacing.gap.base}`}>
                      <h3 className={typography.h4}>Mantenimiento Recurrente</h3>
                      
                      <div className={`flex flex-col ${spacing.gap.small}`}>
                        <Label>Fecha y Hora Programada</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col lg:flex-row gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full lg:flex-1 justify-start text-left font-normal h-10 pl-3 rounded-lg",
                                    !maintenanceScheduledDate && "text-muted-foreground"
                                  )}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {maintenanceScheduledDate ? (
                                    format(new Date(maintenanceScheduledDate + "T00:00:00"), "d 'de' MMMM, yyyy", { locale: es })
                                  ) : (
                                    <span>Selecciona una fecha</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={maintenanceScheduledDate ? new Date(maintenanceScheduledDate + "T00:00:00") : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, "0");
                                      const day = String(date.getDate()).padStart(2, "0");
                                      setMaintenanceScheduledDate(`${year}-${month}-${day}`);
                                    }
                                  }}
                                  initialFocus
                                  locale={dayPickerEs}
                                  captionLayout="dropdown"
                                  fromYear={2020}
                                  toYear={2030}
                                />
                              </PopoverContent>
                            </Popover>
                            <div className="flex flex-col sm:flex-row gap-2 lg:flex-1 items-center">
                              <Input
                                type="number"
                                min="1"
                                max="12"
                                value={(() => {
                                  if (!maintenanceScheduledTime) return "";
                                  const [hours] = maintenanceScheduledTime.split(":");
                                  const hour24 = parseInt(hours, 10);
                                  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                                  return hour12.toString();
                                })()}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 12)) {
                                    const currentMinutes = maintenanceScheduledTime ? maintenanceScheduledTime.split(":")[1] || "00" : "00";
                                    const currentHour24 = maintenanceScheduledTime ? parseInt(maintenanceScheduledTime.split(":")[0], 10) : 0;
                                    const isPM = currentHour24 >= 12;
                                    
                                    if (value === "") {
                                      setMaintenanceScheduledTime(`00:${currentMinutes}`);
                                    } else {
                                      const hour12 = parseInt(value, 10);
                                      const hour24 = hour12 === 12 ? (isPM ? 12 : 0) : (isPM ? hour12 + 12 : hour12);
                                      setMaintenanceScheduledTime(`${String(hour24).padStart(2, "0")}:${currentMinutes}`);
                                    }
                                    if (!maintenanceScheduledTime) {
                                      setMaintenanceIsAllDay(false);
                                    }
                                  }
                                }}
                                disabled={maintenanceIsAllDay}
                                className="w-full sm:w-20 h-10 rounded-lg"
                                placeholder="12"
                              />
                              <span className="text-muted-foreground hidden sm:inline">:</span>
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={maintenanceScheduledTime ? maintenanceScheduledTime.split(":")[1] || "00" : ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 59)) {
                                    const currentHours = maintenanceScheduledTime ? maintenanceScheduledTime.split(":")[0] || "00" : "00";
                                    const minutes = value === "" ? "00" : String(parseInt(value, 10)).padStart(2, "0");
                                    setMaintenanceScheduledTime(`${currentHours}:${minutes}`);
                                    if (!maintenanceScheduledTime) {
                                      setMaintenanceIsAllDay(false);
                                    }
                                  }
                                }}
                                disabled={maintenanceIsAllDay}
                                className="w-full sm:w-20 h-10 rounded-lg"
                                placeholder="00"
                              />
                              <Select
                                value={(() => {
                                  if (!maintenanceScheduledTime) return "AM";
                                  const [hours] = maintenanceScheduledTime.split(":");
                                  const hour24 = parseInt(hours, 10);
                                  return hour24 >= 12 ? "PM" : "AM";
                                })()}
                                onValueChange={(value) => {
                                  const currentTime = maintenanceScheduledTime || "00:00";
                                  const [hours, minutes] = currentTime.split(":");
                                  const hour24 = parseInt(hours, 10);
                                  let newHour24 = hour24;
                                  
                                  if (value === "PM" && hour24 < 12) {
                                    newHour24 = hour24 + 12;
                                  } else if (value === "AM" && hour24 >= 12) {
                                    newHour24 = hour24 - 12;
                                  }
                                  
                                  setMaintenanceScheduledTime(`${String(newHour24).padStart(2, "0")}:${minutes}`);
                                  if (!maintenanceScheduledTime) {
                                    setMaintenanceIsAllDay(false);
                                  }
                                }}
                                disabled={maintenanceIsAllDay}
                              >
                                <SelectTrigger className="w-full sm:w-24 h-10 rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AM">AM</SelectItem>
                                  <SelectItem value="PM">PM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="maintenance-all-day-create"
                              checked={maintenanceIsAllDay}
                              onCheckedChange={(checked) => {
                                setMaintenanceIsAllDay(checked === true);
                                if (checked === true) {
                                  setMaintenanceScheduledTime("00:00");
                                }
                              }}
                            />
                            <Label htmlFor="maintenance-all-day-create" className="cursor-pointer">
                              Todo el día
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Patrón de Recurrencia */}
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${spacing.gap.small}`}>
                        <div className={`flex flex-col ${spacing.gap.small}`}>
                          <Label htmlFor="maintenance-recurrence-pattern-create">Patrón de Recurrencia</Label>
                          <Select value={maintenanceRecurrencePattern} onValueChange={(value: "daily" | "weekly" | "biweekly" | "monthly" | "yearly") => setMaintenanceRecurrencePattern(value)}>
                            <SelectTrigger id="maintenance-recurrence-pattern-create" className="rounded-lg">
                              <SelectValue placeholder="Selecciona el patrón" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Diario</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="biweekly">Bisemanal</SelectItem>
                              <SelectItem value="monthly">Mensual</SelectItem>
                              <SelectItem value="yearly">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Fecha de fin de recurrencia (opcional) */}
                        <div className={`flex flex-col ${spacing.gap.small}`}>
                          <Label htmlFor="maintenance-recurrence-end-date-create">Fecha de Fin (opcional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-10 pl-3 rounded-lg",
                                  !maintenanceRecurrenceEndDate && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {maintenanceRecurrenceEndDate ? (
                                  format(new Date(maintenanceRecurrenceEndDate + "T00:00:00"), "d 'de' MMMM, yyyy", { locale: es })
                                ) : (
                                  <span>Sin fecha de fin</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={maintenanceRecurrenceEndDate ? new Date(maintenanceRecurrenceEndDate + "T00:00:00") : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, "0");
                                    const day = String(date.getDate()).padStart(2, "0");
                                    setMaintenanceRecurrenceEndDate(`${year}-${month}-${day}`);
                                  } else {
                                    setMaintenanceRecurrenceEndDate("");
                                  }
                                }}
                                initialFocus
                                locale={dayPickerEs}
                                captionLayout="dropdown"
                                fromYear={2020}
                                toYear={2030}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className={typography.label}>
                        Responsable(s) del Auto
                      </Label>
                      <MultiSelectCombobox
                        options={availableUsers.map((user) => ({
                          value: user.id,
                          label: user.displayName || user.email || "Usuario",
                          email: user.email,
                          avatar: user.avatar,
                        }))}
                        selectedValues={selectedResponsables}
                        onSelectionChange={(values) => {
                          setSelectedResponsables(values.map((v) => typeof v === 'number' ? v : Number(v)).filter((id) => !isNaN(id)));
                        }}
                        placeholder="Selecciona responsables..."
                        emptyMessage="No hay usuarios disponibles"
                        disabled={isLoadingUsers}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className={typography.label}>
                        Conductores asignados
                      </Label>
                      <MultiSelectCombobox
                        options={availableUsers.map((user) => ({
                          value: user.id,
                          label: user.displayName || user.email || "Usuario",
                          email: user.email,
                          avatar: user.avatar,
                        }))}
                        selectedValues={selectedAssignedDrivers}
                        onSelectionChange={(values) => {
                          setSelectedAssignedDrivers(values.map((v) => typeof v === 'number' ? v : Number(v)).filter((id) => !isNaN(id)));
                        }}
                        placeholder="Selecciona conductores..."
                        emptyMessage="No hay usuarios disponibles"
                        disabled={isLoadingUsers}
                      />
                    </div>

                    {stockQuantity && selectedAssignedDrivers.length > 0 && (
                      <div className="flex flex-col gap-2 p-3 bg-muted rounded-lg">
                        <Label className={typography.label}>
                          Vehículos disponibles
                        </Label>
                        <p className={typography.body.large}>
                          {Math.max(0, Number(stockQuantity) - selectedAssignedDrivers.length)} disponible{Math.max(0, Number(stockQuantity) - selectedAssignedDrivers.length) !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stockQuantity} (stock) - {selectedAssignedDrivers.length} (asignados) = {Math.max(0, Number(stockQuantity) - selectedAssignedDrivers.length)} (disponibles)
                        </p>
                      </div>
                    )}
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

      {/* Dialog de confirmación para eliminar múltiples vehículos */}
      <AlertDialog open={deleteMultipleDialogOpen} onOpenChange={setDeleteMultipleDialogOpen}>
        <AlertDialogContent onClose={() => setDeleteMultipleDialogOpen(false)}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vehículos seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar {selectedVehicles.size} vehículo(s)? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteMultiple}
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
