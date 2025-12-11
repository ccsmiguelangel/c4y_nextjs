"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Checkbox } from "@/components_shadcn/ui/checkbox";
import {
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  Car,
  Calendar,
  DollarSign,
  Settings,
  Upload,
  ImagePlus,
  FileText,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
import { MultiSelectCombobox } from "@/components_shadcn/ui/multi-select-combobox";
import { Calendar as CalendarComponent } from "@/components_shadcn/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components_shadcn/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { es as dayPickerEs } from "react-day-picker/locale";
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
import { strapiImages } from "@/lib/strapi-images";
import { AdminLayout } from "@/components/admin/admin-layout";
import { NotesTimeline, type FleetNote } from "@/components/ui/notes-timeline";
import { VehicleStatusTimeline, type VehicleStatusTimelineProps } from "@/components/ui/vehicle-status-timeline";
import { FleetDocuments } from "@/components/ui/fleet-documents";
import { FleetReminders } from "@/components/ui/fleet-reminders";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import { Camera, X } from "lucide-react";
import { emitReminderCreated, emitReminderUpdated, emitReminderDeleted, emitReminderToggleCompleted, emitReminderToggleActive } from "@/lib/reminder-events";
import type {
  FleetVehicleCard,
  FleetVehicleCondition,
  FleetVehicleUpdatePayload,
  VehicleStatus,
  FleetDocument,
  FleetDocumentType,
  FleetReminder,
  ReminderType,
  RecurrencePattern,
} from "@/validations/types";

const getStatusBadge = (status: FleetVehicleCondition) => {
  switch (status) {
    case "nuevo":
      return (
        <Badge className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-800 dark:text-green-100">
          Nuevo
        </Badge>
      );
    case "usado":
      return (
        <Badge className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-800 dark:text-orange-100">
          Usado
        </Badge>
      );
    case "seminuevo":
      return (
        <Badge className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-800 dark:text-blue-100">
          Seminuevo
        </Badge>
      );
  }
};

export default function FleetDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const vehicleId = params.id as string;

  const [vehicleData, setVehicleData] = useState<FleetVehicleCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    vin: "",
    price: "",
    mileage: "",
    color: "",
    fuelType: "",
    transmission: "",
    condition: "nuevo" as FleetVehicleCondition,
    brand: "",
    model: "",
    year: "",
    imageAlt: "",
    nextMaintenanceDate: "",
    placa: "",
  });
  const [maintenanceScheduledDate, setMaintenanceScheduledDate] = useState("");
  const [maintenanceScheduledTime, setMaintenanceScheduledTime] = useState("");
  const [maintenanceIsAllDay, setMaintenanceIsAllDay] = useState(false);
  const [maintenanceRecurrencePattern, setMaintenanceRecurrencePattern] = useState<RecurrencePattern>("monthly");
  const [maintenanceRecurrenceEndDate, setMaintenanceRecurrenceEndDate] = useState("");
  const [selectedResponsables, setSelectedResponsables] = useState<number[]>([]);
  const [selectedAssignedDrivers, setSelectedAssignedDrivers] = useState<number[]>([]);
  const [selectedInterestedDrivers, setSelectedInterestedDrivers] = useState<number[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notes, setNotes] = useState<FleetNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleStatus[]>([]);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [loadingStatusId, setLoadingStatusId] = useState<string | number | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [statusImages, setStatusImages] = useState<File[]>([]);
  const [statusImagePreviews, setStatusImagePreviews] = useState<string[]>([]);
  const [currentUserDocumentId, setCurrentUserDocumentId] = useState<string | null>(null);
  const [vehicleDocuments, setVehicleDocuments] = useState<FleetDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [documentType, setDocumentType] = useState<FleetDocumentType>("poliza_seguro");
  const [documentOtherDescription, setDocumentOtherDescription] = useState("");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [vehicleReminders, setVehicleReminders] = useState<FleetReminder[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDescription, setReminderDescription] = useState("");
  const [reminderType, setReminderType] = useState<ReminderType>("unique");
  const [reminderScheduledDate, setReminderScheduledDate] = useState("");
  const [reminderScheduledTime, setReminderScheduledTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [reminderRecurrencePattern, setReminderRecurrencePattern] = useState<RecurrencePattern>("daily");
  const [reminderRecurrenceEndDate, setReminderRecurrenceEndDate] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; documentId?: string; displayName?: string; email?: string; avatar?: { url?: string; alternativeText?: string } }>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<number | string | null>(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const previewObjectUrlRef = useRef<string | null>(null);
  const statusImagePreviewRefs = useRef<string[]>([]);
  const updateImagePreview = useCallback((value: string | null, isObjectUrl = false) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    if (isObjectUrl && value) {
      previewObjectUrlRef.current = value;
    }

    setImagePreview(value);
  }, []);

  const syncFormWithVehicle = useCallback(
    async (data: FleetVehicleCard) => {
      setFormData({
        name: data.name,
        vin: data.vin,
        price: data.priceNumber.toString(),
        mileage: data.mileage?.toString() ?? "",
        color: data.color ?? "",
        fuelType: data.fuelType ?? "",
        transmission: data.transmission ?? "",
        condition: data.condition,
        brand: data.brand,
        model: data.model,
        year: data.year.toString(),
        imageAlt: data.imageAlt ?? "",
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate).toISOString().split('T')[0] : "",
        placa: (data as any).placa ?? "",
      });
      
      // Cargar datos de mantenimiento recurrente si existe
      if (data.nextMaintenanceDate) {
        const maintenanceDate = new Date(data.nextMaintenanceDate);
        const year = maintenanceDate.getFullYear();
        const month = String(maintenanceDate.getMonth() + 1).padStart(2, "0");
        const day = String(maintenanceDate.getDate()).padStart(2, "0");
        setMaintenanceScheduledDate(`${year}-${month}-${day}`);
        
        const hours = String(maintenanceDate.getHours()).padStart(2, "0");
        const minutes = String(maintenanceDate.getMinutes()).padStart(2, "0");
        const timeValue = `${hours}:${minutes}`;
        setMaintenanceScheduledTime(timeValue);
        setMaintenanceIsAllDay(timeValue === "00:00");
      } else {
        setMaintenanceScheduledDate("");
        setMaintenanceScheduledTime("");
        setMaintenanceIsAllDay(false);
      }
      updateImagePreview(data.imageUrl ?? null);
      setSelectedImageFile(null);
      setShouldRemoveImage(false);
      
      // Cargar responsables y conductores asignados desde los datos normalizados
      // Primero intentar usar los datos normalizados del vehículo
      if (data.responsables && data.responsables.length > 0) {
        const responsablesIds = data.responsables
          .map((r) => r.id)
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        setSelectedResponsables(responsablesIds);
      } else {
        setSelectedResponsables([]);
      }
      
      if (data.assignedDrivers && data.assignedDrivers.length > 0) {
        const assignedDriversIds = data.assignedDrivers
          .map((d) => d.id)
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        setSelectedAssignedDrivers(assignedDriversIds);
      } else {
        setSelectedAssignedDrivers([]);
      }
      
      if (data.interestedDrivers && data.interestedDrivers.length > 0) {
        const interestedDriversIds = data.interestedDrivers
          .map((d) => d.id)
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        setSelectedInterestedDrivers(interestedDriversIds);
      } else {
        setSelectedInterestedDrivers([]);
      }
      
      // Si no hay datos normalizados, intentar cargar desde la API raw como fallback
      if ((!data.responsables || data.responsables.length === 0) && (!data.assignedDrivers || data.assignedDrivers.length === 0)) {
        try {
          const rawResponse = await fetch(`/api/fleet/${vehicleId}?includeRaw=true`, { cache: "no-store" });
          if (rawResponse.ok) {
            const { data: rawData } = (await rawResponse.json()) as { data: any };
            if (rawData?.attributes?.responsables?.data) {
              const responsablesIds = rawData.attributes.responsables.data
                .map((r: any) => r.id)
                .filter((id: any): id is number => typeof id === 'number' && !isNaN(id));
              setSelectedResponsables(responsablesIds);
            }
            if (rawData?.attributes?.assignedDrivers?.data) {
              const assignedDriversIds = rawData.attributes.assignedDrivers.data
                .map((d: any) => d.id)
                .filter((id: any): id is number => typeof id === 'number' && !isNaN(id));
              setSelectedAssignedDrivers(assignedDriversIds);
            }
          }
        } catch (error) {
          console.error("Error cargando responsables y conductores:", error);
        }
      }
    },
    [updateImagePreview, vehicleId]
  );

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  // Activar modo de edición si viene el query parameter
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam === "true" && !isLoading && vehicleData) {
      setIsEditing(true);
      // Limpiar el query parameter de la URL sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, isLoading, vehicleData]);

  const priceLabel = useMemo(() => {
    if (!vehicleData) return "";
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(vehicleData.priceNumber);
  }, [vehicleData]);

  const loadVehicle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/fleet/${vehicleId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No pudimos obtener el vehículo");
      }
      const { data } = (await response.json()) as { data: FleetVehicleCard };
      
      if (process.env.NODE_ENV === 'development') {
        console.log("📥 Datos recibidos en loadVehicle:", {
          assignedDrivers: data.assignedDrivers,
          responsables: data.responsables,
        });
      }
      
      setVehicleData(data);
      await syncFormWithVehicle(data);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error cargando vehículo:", error);
      setErrorMessage("No pudimos obtener la información de este vehículo.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    try {
      const response = await fetch(`/api/fleet/${vehicleId}/notes`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No pudimos obtener las notas");
      }
      const { data } = (await response.json()) as { data: FleetNote[] };
      setNotes(data || []);
    } catch (error) {
      console.error("Error cargando notas:", error);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [vehicleId]);

  // Cargar el user-profile del usuario actual
  const loadCurrentUserProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/user-profile/me", { cache: "no-store" });
      if (response.ok) {
        const { data } = (await response.json()) as { data: { documentId?: string } };
        if (data?.documentId) {
          setCurrentUserDocumentId(data.documentId);
          console.log("✅ User-profile cargado, documentId:", data.documentId);
        } else {
          console.warn("⚠️ User-profile obtenido pero sin documentId:", data);
          setCurrentUserDocumentId(null);
        }
      } else {
        const errorText = await response.text();
        console.warn("⚠️ No se pudo obtener el user-profile del usuario actual:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        setCurrentUserDocumentId(null);
      }
    } catch (error) {
      console.error("❌ Error cargando user-profile:", error);
      setCurrentUserDocumentId(null);
    }
  }, []);

  const loadVehicleStatuses = useCallback(async () => {
    setIsLoadingStatuses(true);
    try {
      const response = await fetch(`/api/fleet/${vehicleId}/status`, { cache: "no-store" });
      if (!response.ok) {
        // Si es 404, probablemente el tipo de contenido no existe todavía en Strapi
        // En ese caso, simplemente retornar un array vacío
        if (response.status === 404) {
          console.warn("Tipo de contenido 'fleet-statuses' no encontrado en Strapi. Retornando array vacío.");
          setVehicleStatuses([]);
          return;
        }
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || "No pudimos obtener los estados");
      }
      const { data } = (await response.json()) as { data: VehicleStatus[] };
      setVehicleStatuses(data || []);
    } catch (error) {
      console.error("Error cargando estados:", error);
      // En caso de error, establecer array vacío para que la UI no se rompa
      setVehicleStatuses([]);
    } finally {
      setIsLoadingStatuses(false);
    }
  }, [vehicleId]);

  // Funciones para recordatorios y usuarios
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
      toast.error("Error al cargar usuarios", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Efecto para sincronizar seleccionados cuando se cargan los usuarios disponibles
  useEffect(() => {
    if (availableUsers.length > 0 && vehicleData) {
      // Mapear responsables usando documentId o id
      if (vehicleData.responsables && vehicleData.responsables.length > 0) {
        const responsablesIds = vehicleData.responsables
          .map((resp) => {
            // Buscar el usuario en availableUsers por id o documentId
            const foundUser = availableUsers.find(
              (u) => u.id === resp.id || u.documentId === resp.documentId
            );
            if (foundUser) {
              if (process.env.NODE_ENV === 'development') {
                console.log("🔍 Mapeando responsable:", {
                  respId: resp.id,
                  respDocumentId: resp.documentId,
                  foundUserId: foundUser.id,
                  foundUserDocumentId: foundUser.documentId,
                });
              }
              return foundUser.id;
            }
            // Si no se encuentra por id/documentId, intentar usar directamente el id del resp
            return resp.id;
          })
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        
        if (process.env.NODE_ENV === 'development') {
          console.log("✅ Responsables IDs mapeados:", responsablesIds);
        }
        
        if (responsablesIds.length > 0) {
          setSelectedResponsables(responsablesIds);
        }
      }
      
      // Mapear conductores usando documentId o id
      if (vehicleData.assignedDrivers && vehicleData.assignedDrivers.length > 0) {
        const assignedDriversIds = vehicleData.assignedDrivers
          .map((driver) => {
            // Buscar el usuario en availableUsers por id o documentId
            const foundUser = availableUsers.find(
              (u) => u.id === driver.id || u.documentId === driver.documentId
            );
            if (foundUser) {
              if (process.env.NODE_ENV === 'development') {
                console.log("🔍 Mapeando conductor:", {
                  driverId: driver.id,
                  driverDocumentId: driver.documentId,
                  foundUserId: foundUser.id,
                  foundUserDocumentId: foundUser.documentId,
                });
              }
              return foundUser.id;
            }
            // Si no se encuentra por id/documentId, intentar usar directamente el id del driver
            return driver.id;
          })
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        
        if (process.env.NODE_ENV === 'development') {
          console.log("✅ Conductores IDs mapeados:", assignedDriversIds);
        }
        
        if (assignedDriversIds.length > 0) {
          setSelectedAssignedDrivers(assignedDriversIds);
        }
      }
    }
  }, [availableUsers, vehicleData]);

  useEffect(() => {
    loadVehicle();
    loadNotes();
    loadVehicleStatuses();
    loadVehicleDocuments();
    loadVehicleReminders();
    loadAvailableUsers();
    loadCurrentUserProfile();
  }, [vehicleId, syncFormWithVehicle, loadNotes, loadVehicleStatuses, loadCurrentUserProfile, loadAvailableUsers]);

  const handleSaveChanges = async () => {
    if (!vehicleData) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      let uploadedImageId: number | null = null;
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

      const payload: FleetVehicleUpdatePayload = {
        name: formData.name || vehicleData.name,
        vin: formData.vin || vehicleData.vin,
        price: Number(formData.price) || 0,
        mileage: formData.mileage ? Number(formData.mileage) : null,
        color: formData.color || null,
        fuelType: formData.fuelType || null,
        transmission: formData.transmission || null,
        condition: formData.condition,
        brand: formData.brand,
        model: formData.model,
        year: Number(formData.year) || vehicleData.year,
        imageAlt: formData.imageAlt || null,
        placa: formData.placa || null,
        nextMaintenanceDate: maintenanceScheduledDate ? (() => {
          const timeToUse = maintenanceIsAllDay ? "00:00" : (maintenanceScheduledTime || "00:00");
          return `${maintenanceScheduledDate}T${timeToUse}:00`;
        })() : null,
        responsables: selectedResponsables,
        assignedDrivers: selectedAssignedDrivers,
        interestedDrivers: selectedInterestedDrivers,
      };

      console.log("📤 Enviando payload:", {
        responsables: payload.responsables,
        assignedDrivers: payload.assignedDrivers,
        selectedResponsables,
        selectedAssignedDrivers,
        responsablesLength: selectedResponsables.length,
        assignedDriversLength: selectedAssignedDrivers.length,
      });

      if (uploadedImageId !== null) {
        payload.image = uploadedImageId;
      } else if (shouldRemoveImage) {
        payload.image = null;
      }

      const targetId = vehicleData.documentId ?? vehicleId;
      const response = await fetch(`/api/fleet/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      if (!response.ok) {
        let errorMessage = "No se pudo guardar los cambios";
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorMessage;
        } catch {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Sincronizar fecha de mantenimiento con recordatorios
      if (maintenanceScheduledDate) {
        await syncMaintenanceReminder(maintenanceScheduledDate, maintenanceScheduledTime, maintenanceIsAllDay, maintenanceRecurrencePattern, maintenanceRecurrenceEndDate);
      } else {
        // Si se eliminó la fecha de mantenimiento, eliminar el recordatorio de mantenimiento correspondiente
        const maintenanceReminder = vehicleReminders.find(
          (r) => r.title.toLowerCase().includes("mantenimiento") || r.title === "Mantenimiento completo del vehículo"
        );
        
        if (maintenanceReminder) {
          const reminderId = maintenanceReminder.documentId || String(maintenanceReminder.id);
          try {
            await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderId)}`, {
              method: "DELETE",
            });
            await loadVehicleReminders();
            console.log("✅ Recordatorio de mantenimiento eliminado al quitar la fecha");
          } catch (error) {
            console.error("Error eliminando recordatorio de mantenimiento:", error);
          }
        }
      }

      // Recargar el vehículo completo para obtener todas las relaciones actualizadas
      await loadVehicle();
      setIsEditing(false);
      toast.success("Vehículo actualizado correctamente");
    } catch (error) {
      console.error("Error guardando vehículo:", error);
      const errorMessage = error instanceof Error ? error.message : "No pudimos guardar los cambios. Intenta nuevamente.";
      const isUploadError = errorMessage.includes("imagen") || errorMessage.includes("archivo") || errorMessage.includes("subir");
      
      if (isUploadError) {
        setErrorMessage(errorMessage);
        toast.error("Error al subir imagen", {
          description: errorMessage,
        });
      } else {
        setErrorMessage(errorMessage);
        toast.error("Error al guardar", {
          description: errorMessage,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Función para sincronizar la fecha de mantenimiento con recordatorios
  const syncMaintenanceReminder = async (
    maintenanceDate: string,
    maintenanceTime: string,
    isAllDay: boolean,
    recurrencePattern: RecurrencePattern,
    recurrenceEndDate?: string
  ) => {
    try {
      const maintenanceTitle = "Mantenimiento completo del vehículo";
      
      // Buscar si ya existe un recordatorio de mantenimiento para este vehículo
      const existingReminder = vehicleReminders.find(
        (r) => r.title.toLowerCase().includes("mantenimiento") || r.title === maintenanceTitle
      );

      const timeToUse = isAllDay ? "00:00" : (maintenanceTime || "00:00");
      const scheduledDateTime = `${maintenanceDate}T${timeToUse}:00`;

      if (existingReminder) {
        // Actualizar el recordatorio existente
        const reminderId = existingReminder.documentId || String(existingReminder.id);
        const updateData: any = {
          title: maintenanceTitle,
          scheduledDate: scheduledDateTime,
          nextTrigger: scheduledDateTime,
          isAllDay: isAllDay,
          reminderType: "recurring",
          recurrencePattern: recurrencePattern,
        };
        
        if (recurrenceEndDate) {
          updateData.recurrenceEndDate = `${recurrenceEndDate}T00:00:00`;
        }
        
        const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: updateData,
          }),
        });

        if (response.ok) {
          await loadVehicleReminders();
          console.log("✅ Recordatorio de mantenimiento actualizado");
        }
      } else {
        // Crear nuevo recordatorio
        if (!currentUserDocumentId) {
          console.warn("⚠️ No se puede crear recordatorio: usuario no identificado");
          return;
        }

        // Asignar a responsables y conductores si existen
        const assignedUserIds = [
          ...selectedResponsables,
          ...selectedAssignedDrivers,
        ].filter((id, index, self) => self.indexOf(id) === index); // Eliminar duplicados

        const createData: any = {
          title: maintenanceTitle,
          description: `Mantenimiento completo programado para el vehículo ${vehicleData?.name || ""}`,
          reminderType: "recurring" as ReminderType,
          scheduledDate: scheduledDateTime,
          isAllDay: isAllDay,
          recurrencePattern: recurrencePattern,
          assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : undefined,
          authorDocumentId: currentUserDocumentId,
        };
        
        if (recurrenceEndDate) {
          createData.recurrenceEndDate = `${recurrenceEndDate}T00:00:00`;
        }

        const response = await fetch(`/api/fleet/${vehicleId}/reminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: createData,
          }),
        });

        if (response.ok) {
          await loadVehicleReminders();
          console.log("✅ Recordatorio de mantenimiento creado");
        }
      }
    } catch (error) {
      console.error("Error sincronizando recordatorio de mantenimiento:", error);
      // No mostrar error al usuario, solo loguear
    }
  };

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    updateImagePreview(objectUrl, true);
    setSelectedImageFile(file);
    setShouldRemoveImage(false);
  };

  const handleRemoveImage = () => {
    updateImagePreview(null);
    setSelectedImageFile(null);
    setShouldRemoveImage(true);
  };

  const handleRestoreOriginalImage = () => {
    if (!vehicleData?.imageUrl) return;
    updateImagePreview(vehicleData.imageUrl);
    setSelectedImageFile(null);
    setShouldRemoveImage(false);
  };

  const handleCancelEdit = () => {
    if (vehicleData) {
      syncFormWithVehicle(vehicleData);
    }
    setIsEditing(false);
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleData) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const targetId = vehicleData.documentId ?? vehicleData.id;
      const response = await fetch(`/api/fleet/${targetId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("delete_failed");
      }
      router.push("/fleet");
    } catch (error) {
      console.error("Error eliminando vehículo:", error);
      setErrorMessage("No pudimos eliminar el vehículo. Intenta nuevamente.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleConfirmDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void handleDeleteVehicle();
  };

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    
    // Si no tenemos el documentId, intentar cargarlo antes de guardar
    if (!currentUserDocumentId) {
      console.warn("⚠️ No hay currentUserDocumentId, intentando cargarlo...");
      await loadCurrentUserProfile();
      // Si después de cargar sigue siendo null, el backend lo obtendrá automáticamente
    }
    
    setIsSavingNote(true);
    setErrorMessage(null);
    try {
      // Solo incluir authorDocumentId si está disponible, sino el backend lo obtendrá
      const requestBody: { data: { content: string; authorDocumentId?: string } } = {
        data: {
          content: note.trim(),
        },
      };
      
      if (currentUserDocumentId) {
        requestBody.data.authorDocumentId = currentUserDocumentId;
        console.log("📤 Enviando nota con authorDocumentId:", currentUserDocumentId);
      } else {
        console.log("📤 Enviando nota sin authorDocumentId (el backend lo obtendrá)");
      }
      
      const response = await fetch(`/api/fleet/${vehicleId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          errorData = errorText ? JSON.parse(errorText) : { error: "Error desconocido" };
        } catch (parseError) {
          errorData = { error: `Error ${response.status}: ${response.statusText}` };
        }
        console.error("Error guardando nota - Response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorDataKeys: Object.keys(errorData || {}),
        });
        
        // Extraer el mensaje de error de diferentes formatos posibles
        let errorMsg = `Error ${response.status}: ${response.statusText}`;
        if (errorData?.error) {
          errorMsg = typeof errorData.error === "string" 
            ? errorData.error 
            : errorData.error.message || errorMsg;
        } else if (errorData?.message) {
          errorMsg = errorData.message;
        }
        
        throw new Error(errorMsg);
      }

      const { data } = (await response.json()) as { data: FleetNote };
      setNotes((prev) => [data, ...prev]);
      setNote("");
      
      // Cerrar formulario después de guardar
      setShowNoteForm(false);
      
      toast.success("Nota guardada con éxito", {
        description: "Tu comentario ha sido agregado al timeline",
      });
    } catch (error) {
      console.error("Error guardando nota:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(`No pudimos guardar la nota: ${errorMessage}. Intenta nuevamente.`);
      toast.error("Error al guardar nota", {
        description: errorMessage,
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleEditNote = async (noteId: number | string, editContent: string) => {
    try {
      const noteIdStr = String(noteId);
      const url = `/api/fleet-notes/${encodeURIComponent(noteIdStr)}`;
      console.log("========== EDITANDO NOTA ==========");
      console.log("vehicleId:", vehicleId);
      console.log("noteId:", noteIdStr);
      console.log("URL construida:", url);
      console.log("editContent:", editContent);
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            content: editContent,
            vehicleId: vehicleId, // Incluir vehicleId para validación opcional
          },
        }),
      });

      console.log("Respuesta de edición:", { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error text recibido:", errorText);
        let errorData;
        try {
          errorData = errorText ? JSON.parse(errorText) : null;
        } catch (parseError) {
          console.error("Error parseando JSON:", parseError);
          errorData = null;
        }
        
        const errorMessage = errorData?.error || 
                            errorText || 
                            `Error ${response.status}: ${response.statusText}`;
        
        console.error("Error en respuesta de edición:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorText,
          errorMessage
        });
        
        throw new Error(errorMessage);
      }

      const { data } = (await response.json()) as { data: FleetNote };
      setNotes((prev) => prev.map((n) => (n.id === data.id || n.documentId === data.documentId ? data : n)));
      toast.success("Nota actualizada", {
        description: "Tu comentario ha sido actualizado",
      });
    } catch (error) {
      console.error("Error editando nota:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al actualizar nota", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: number | string) => {
    try {
      const noteIdStr = String(noteId);
      const response = await fetch(`/api/fleet-notes/${encodeURIComponent(noteIdStr)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      setNotes((prev) => prev.filter((n) => n.id !== noteId && n.documentId !== noteId));
      toast.success("Nota eliminada", {
        description: "El comentario ha sido eliminado",
      });
    } catch (error) {
      console.error("Error eliminando nota:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar nota", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleStatusImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Limpiar previews anteriores
    statusImagePreviewRefs.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    statusImagePreviewRefs.current = [];

    const newPreviews: string[] = [];
    files.forEach((file) => {
      const objectUrl = URL.createObjectURL(file);
      newPreviews.push(objectUrl);
      statusImagePreviewRefs.current.push(objectUrl);
    });

    setStatusImages(files);
    setStatusImagePreviews(newPreviews);
  };

  const handleRemoveStatusImage = (index: number) => {
    // Revocar URL del objeto
    if (statusImagePreviewRefs.current[index]) {
      URL.revokeObjectURL(statusImagePreviewRefs.current[index]);
    }

    const newImages = statusImages.filter((_, i) => i !== index);
    const newPreviews = statusImagePreviews.filter((_, i) => i !== index);
    const newRefs = statusImagePreviewRefs.current.filter((_, i) => i !== index);

    setStatusImages(newImages);
    setStatusImagePreviews(newPreviews);
    statusImagePreviewRefs.current = newRefs;
  };

  const handleSaveStatus = async () => {
    if (statusImages.length === 0 && !statusComment.trim()) {
      toast.error("Error al guardar estado", {
        description: "Debes proporcionar al menos una imagen o un comentario",
      });
      return;
    }

    if (!currentUserDocumentId) {
      await loadCurrentUserProfile();
    }

    setIsSavingStatus(true);
    setErrorMessage(null);
    try {
      // Subir imágenes primero
      const uploadedImageIds: number[] = [];
      for (const imageFile of statusImages) {
        // Validar tipo de archivo
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(imageFile.type)) {
          throw new Error(`Tipo de archivo no válido. Solo se permiten imágenes: ${validImageTypes.join(', ')}`);
        }
        
        // Validar tamaño (máximo 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB en bytes
        if (imageFile.size > maxSize) {
          throw new Error(`La imagen es demasiado grande. El tamaño máximo permitido es 10MB.`);
        }
        
        const uploadForm = new FormData();
        uploadForm.append("files", imageFile);
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
        const imageId = uploadPayload?.data?.id;
        if (!imageId) {
          throw new Error("No se pudo obtener el ID de la imagen subida");
        }
        uploadedImageIds.push(imageId);
      }

      const requestBody: { data: { comment?: string; images?: number[]; authorDocumentId?: string } } = {
        data: {},
      };

      if (statusComment.trim()) {
        requestBody.data.comment = statusComment.trim();
      }

      if (uploadedImageIds.length > 0) {
        requestBody.data.images = uploadedImageIds;
      }

      if (currentUserDocumentId) {
        requestBody.data.authorDocumentId = currentUserDocumentId;
      }

      const response = await fetch(`/api/fleet/${vehicleId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          errorData = errorText ? JSON.parse(errorText) : { error: "Error desconocido" };
        } catch {
          errorData = { error: `Error ${response.status}: ${response.statusText}` };
        }
        
        // Manejo específico para Method Not Allowed
        if (response.status === 405) {
          throw new Error("El método POST no está permitido en esta ruta. Por favor, reinicia el servidor de desarrollo.");
        }
        
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const { data: createdStatus } = (await response.json()) as { data: VehicleStatus };
      const statusId = createdStatus.documentId || createdStatus.id;
      
      // Agregar el estado con un placeholder mientras cargamos los datos completos
      setVehicleStatuses((prev) => [createdStatus, ...prev]);
      setLoadingStatusId(statusId);
      
      // Limpiar formulario inmediatamente
      setStatusComment("");
      setStatusImages([]);
      setStatusImagePreviews([]);
      
      // Cerrar formulario después de guardar
      setShowStatusForm(false);
      statusImagePreviewRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      statusImagePreviewRefs.current = [];
      
      // Hacer GET para obtener los datos completos con imágenes
      // Esperar un momento para que Strapi procese las imágenes
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      try {
        const getResponse = await fetch(`/api/fleet/${vehicleId}/status`, { cache: "no-store" });
        if (getResponse.ok) {
          const { data: allStatuses } = (await getResponse.json()) as { data: VehicleStatus[] };
          // Encontrar el estado recién creado y actualizarlo
          const updatedStatus = allStatuses.find(
            (s) => (s.documentId && s.documentId === statusId) || (s.id && String(s.id) === String(statusId))
          );
          
          if (updatedStatus) {
            setVehicleStatuses((prev) =>
              prev.map((s) =>
                (s.documentId && s.documentId === statusId) || (s.id && String(s.id) === String(statusId))
                  ? updatedStatus
                  : s
              )
            );
          } else {
            // Si no se encuentra, recargar todos los estados
            await loadVehicleStatuses();
          }
        } else {
          // Si falla, recargar todos los estados
          await loadVehicleStatuses();
        }
      } catch (error) {
        console.error("Error obteniendo estado completo:", error);
        // Si falla el GET, recargar todos los estados
        await loadVehicleStatuses();
      } finally {
        setLoadingStatusId(null);
      }
      
      toast.success("Estado guardado con éxito", {
        description: "El estado del vehículo ha sido registrado",
      });
    } catch (error) {
      console.error("Error guardando estado:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(`No pudimos guardar el estado: ${errorMessage}. Intenta nuevamente.`);
      toast.error("Error al guardar estado", {
        description: errorMessage,
      });
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleEditStatus = async (statusId: number | string, editComment: string, imageIds?: number[], newImages?: File[]) => {
    try {
      const statusIdStr = String(statusId);
      const url = `/api/fleet-status/${encodeURIComponent(statusIdStr)}`;
      
      // Subir nuevas imágenes primero si hay
      let uploadedImageIds: number[] = [];
      if (newImages && newImages.length > 0) {
        for (const imageFile of newImages) {
          const uploadForm = new FormData();
          uploadForm.append("files", imageFile);
          const uploadResponse = await fetch("/api/strapi/upload", {
            method: "POST",
            body: uploadForm,
          });
          if (!uploadResponse.ok) {
            throw new Error("Error al subir las nuevas imágenes");
          }
          const uploadPayload = (await uploadResponse.json()) as { data?: { id?: number } };
          const imageId = uploadPayload?.data?.id;
          if (imageId) {
            uploadedImageIds.push(imageId);
          }
        }
      }
      
      // Combinar IDs de imágenes existentes con las nuevas
      const allImageIds = imageIds ? [...imageIds, ...uploadedImageIds] : uploadedImageIds;
      
      const requestBody: { data: { comment?: string; images?: number[]; vehicleId?: string } } = {
        data: {
          vehicleId: vehicleId,
        },
      };
      
      if (editComment.trim()) {
        requestBody.data.comment = editComment.trim();
      }
      
      if (allImageIds.length > 0) {
        requestBody.data.images = allImageIds;
      } else if (imageIds !== undefined) {
        // Si no hay nuevas imágenes pero se eliminaron todas, enviar array vacío
        requestBody.data.images = [];
      }
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = errorText ? JSON.parse(errorText) : null;
        } catch {
          errorData = null;
        }
        
        const errorMessage = errorData?.error || 
                            errorText || 
                            `Error ${response.status}: ${response.statusText}`;
        
        throw new Error(errorMessage);
      }

      const { data } = (await response.json()) as { data: VehicleStatus };
      setVehicleStatuses((prev) => prev.map((s) => (s.id === data.id || s.documentId === data.documentId ? data : s)));
      toast.success("Estado actualizado", {
        description: "El estado del vehículo ha sido actualizado",
      });
    } catch (error) {
      console.error("Error editando estado:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al actualizar estado", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleDeleteStatus = async (statusId: number | string) => {
    try {
      const statusIdStr = String(statusId);
      const response = await fetch(`/api/fleet-status/${encodeURIComponent(statusIdStr)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      setVehicleStatuses((prev) => prev.filter((s) => s.id !== statusId && s.documentId !== statusId));
      toast.success("Estado eliminado", {
        description: "El estado del vehículo ha sido eliminado",
      });
    } catch (error) {
      console.error("Error eliminando estado:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar estado", {
        description: errorMessage,
      });
      throw error;
    }
  };

  // Funciones para documentos
  const loadVehicleDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`/api/fleet/${vehicleId}/document`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No pudimos obtener los documentos");
      }
      const { data } = (await response.json()) as { data: FleetDocument[] };
      setVehicleDocuments(data || []);
    } catch (error) {
      console.error("Error cargando documentos:", error);
      toast.error("Error al cargar documentos", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleDocumentFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const invalidFiles = files.filter(file => file.size > MAX_SIZE);
    
    if (invalidFiles.length > 0) {
      toast.error("Archivos demasiado grandes", {
        description: `Algunos archivos exceden el tamaño máximo de 5MB. Archivos rechazados: ${invalidFiles.map(f => f.name).join(", ")}`,
      });
      // Filtrar solo los archivos válidos
      const validFiles = files.filter(file => file.size <= MAX_SIZE);
      setDocumentFiles(prev => [...prev, ...validFiles]);
    } else {
      setDocumentFiles(prev => [...prev, ...files]);
    }
    
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    event.target.value = '';
  };

  const handleRemoveDocumentFile = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDocument = async () => {
    if (documentFiles.length === 0) {
      toast.error("Error", {
        description: "Debes seleccionar al menos un archivo",
      });
      return;
    }

    if (documentType === "otros" && !documentOtherDescription.trim()) {
      toast.error("Error", {
        description: "Debes describir el tipo de documento cuando seleccionas 'Otros'",
      });
      return;
    }

    setIsSavingDocument(true);
    setErrorMessage(null);
    try {
      // Subir archivos primero
      const uploadedFileIds: number[] = [];
      for (const file of documentFiles) {
        const uploadForm = new FormData();
        uploadForm.append("files", file);
        const uploadResponse = await fetch("/api/strapi/upload", {
          method: "POST",
          body: uploadForm,
        });
        if (!uploadResponse.ok) {
          throw new Error("Error al subir los archivos");
        }
        const uploadPayload = (await uploadResponse.json()) as { data?: { id?: number } };
        const fileId = uploadPayload?.data?.id;
        if (fileId) {
          uploadedFileIds.push(fileId);
        }
      }

      const requestBody: { data: { documentType: FleetDocumentType; files: number[]; authorDocumentId?: string; otherDescription?: string } } = {
        data: {
          documentType: documentType,
          files: uploadedFileIds,
        },
      };

      // Agregar descripción si es tipo "otros"
      if (documentType === "otros" && documentOtherDescription.trim()) {
        requestBody.data.otherDescription = documentOtherDescription.trim();
      }

      if (currentUserDocumentId) {
        requestBody.data.authorDocumentId = currentUserDocumentId;
      }

      const response = await fetch(`/api/fleet/${vehicleId}/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          errorData = errorText ? JSON.parse(errorText) : { error: "Error desconocido" };
        } catch {
          errorData = { error: `Error ${response.status}: ${response.statusText}` };
        }
        
        if (response.status === 405) {
          throw new Error("El método POST no está permitido en esta ruta. Por favor, reinicia el servidor de desarrollo.");
        }
        
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const { data: createdDocument } = (await response.json()) as { data: FleetDocument };
      
      // Recargar documentos
      await loadVehicleDocuments();
      
      // Limpiar formulario
      setDocumentFiles([]);
      setDocumentType("poliza_seguro");
      setDocumentOtherDescription("");
      
      // Cerrar formulario después de guardar
      setShowDocumentForm(false);
      
      toast.success("Documento guardado", {
        description: "El documento ha sido guardado correctamente",
      });
    } catch (error) {
      console.error("Error guardando documento:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al guardar documento", {
        description: errorMessage,
      });
    } finally {
      setIsSavingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: number | string) => {
    try {
      const documentIdStr = String(documentId);
      const response = await fetch(`/api/fleet-document/${encodeURIComponent(documentIdStr)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      setVehicleDocuments((prev) => prev.filter((d) => d.id !== documentId && d.documentId !== documentId));
      toast.success("Documento eliminado", {
        description: "El documento ha sido eliminado",
      });
    } catch (error) {
      console.error("Error eliminando documento:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar documento", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const loadVehicleReminders = async () => {
    setIsLoadingReminders(true);
    try {
      const response = await fetch(`/api/fleet/${vehicleId}/reminder`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No pudimos obtener los recordatorios");
      }
      const { data } = (await response.json()) as { data: FleetReminder[] };
      setVehicleReminders(data || []);
    } catch (error) {
      console.error("Error cargando recordatorios:", error);
      toast.error("Error al cargar recordatorios", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoadingReminders(false);
    }
  };

  const handleSaveReminder = async () => {
    if (!reminderTitle?.trim() || !reminderScheduledDate) {
      toast.error("Error", {
        description: "El título y la fecha programada son requeridos",
      });
      return;
    }

    if (!selectedUserIds || selectedUserIds.length === 0) {
      toast.error("Error", {
        description: "Debes asignar al menos un usuario al recordatorio",
      });
      return;
    }
    
    // Combinar fecha y hora (si es todo el día, usar 00:00)
    const timeToUse = isAllDay ? "00:00" : (reminderScheduledTime || "00:00");
    const scheduledDateTime = `${reminderScheduledDate}T${timeToUse}:00`;

    if (reminderType === "recurring" && !reminderRecurrencePattern) {
      toast.error("Error", {
        description: "El patrón de recurrencia es requerido para recordatorios recurrentes",
      });
      return;
    }

    setIsSavingReminder(true);
    setErrorMessage(null);
    try {
      const requestBody: { data: { title: string; description?: string; reminderType: ReminderType; scheduledDate: string; recurrencePattern?: RecurrencePattern; recurrenceEndDate?: string; assignedUserIds: number[]; authorDocumentId?: string; isAllDay?: boolean } } = {
        data: {
          title: reminderTitle?.trim() || "",
          reminderType: reminderType,
          scheduledDate: scheduledDateTime,
          isAllDay: isAllDay,
          assignedUserIds: selectedUserIds,
        },
      };

      if (reminderDescription.trim()) {
        requestBody.data.description = reminderDescription.trim();
      }

      if (reminderType === "recurring") {
        requestBody.data.recurrencePattern = reminderRecurrencePattern;
        if (reminderRecurrenceEndDate) {
          requestBody.data.recurrenceEndDate = reminderRecurrenceEndDate;
        }
      }

      // Si estamos editando, usar PATCH
      if (editingReminderId) {
        const reminderIdStr = String(editingReminderId);
        const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderIdStr)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let errorData;
          try {
            const errorText = await response.text();
            errorData = errorText ? JSON.parse(errorText) : { error: "Error desconocido" };
          } catch {
            errorData = { error: `Error ${response.status}: ${response.statusText}` };
          }
          
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const { data: updatedReminder } = (await response.json()) as { data: FleetReminder };
        
        // Si es un recordatorio de mantenimiento, actualizar también el nextMaintenanceDate del vehículo
        const isMaintenanceReminder = updatedReminder.title.toLowerCase().includes("mantenimiento") || 
                                      updatedReminder.title === "Mantenimiento completo del vehículo";
        
        if (isMaintenanceReminder && vehicleId) {
          try {
            const maintenanceDate = updatedReminder.scheduledDate;
            await fetch(`/api/fleet/${vehicleId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: {
                  nextMaintenanceDate: maintenanceDate,
                },
              }),
            });
            // Recargar el vehículo para actualizar la UI
            await loadVehicle();
          } catch (error) {
            console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
          }
        }
        
        // Recargar recordatorios
        await loadVehicleReminders();
        
        // Emitir evento de actualización
        emitReminderUpdated(updatedReminder);
        
        // Limpiar formulario y estado de edición
        setReminderTitle("");
        setReminderDescription("");
        setReminderType("unique");
        setReminderScheduledDate("");
        setReminderScheduledTime("");
        setIsAllDay(false);
        setReminderRecurrencePattern("daily");
        setReminderRecurrenceEndDate("");
        setSelectedUserIds([]);
        setEditingReminderId(null);
        
        // Ocultar el formulario después de guardar
        setShowReminderForm(false);
        
        toast.success("Recordatorio actualizado", {
          description: "El recordatorio ha sido actualizado correctamente",
        });
      } else {
        // Crear nuevo recordatorio
        if (currentUserDocumentId) {
          requestBody.data.authorDocumentId = currentUserDocumentId;
        }

        const response = await fetch(`/api/fleet/${vehicleId}/reminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let errorData;
          try {
            const errorText = await response.text();
            errorData = errorText ? JSON.parse(errorText) : { error: "Error desconocido" };
          } catch {
            errorData = { error: `Error ${response.status}: ${response.statusText}` };
          }
          
          if (response.status === 405) {
            throw new Error("El método POST no está permitido en esta ruta. Por favor, reinicia el servidor de desarrollo.");
          }
          
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const { data: createdReminder } = (await response.json()) as { data: FleetReminder };
        
        // Si es un recordatorio de mantenimiento, actualizar también el nextMaintenanceDate del vehículo
        const isMaintenanceReminder = createdReminder.title.toLowerCase().includes("mantenimiento") || 
                                      createdReminder.title === "Mantenimiento completo del vehículo";
        
        if (isMaintenanceReminder && vehicleId) {
          try {
            const maintenanceDate = createdReminder.scheduledDate;
            await fetch(`/api/fleet/${vehicleId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: {
                  nextMaintenanceDate: maintenanceDate,
                },
              }),
            });
            // Recargar el vehículo para actualizar la UI
            await loadVehicle();
          } catch (error) {
            console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
          }
        }
        
        // Recargar recordatorios
        await loadVehicleReminders();
        
        // Emitir evento de creación
        emitReminderCreated(createdReminder);
        
        // Limpiar formulario
        setReminderTitle("");
        setReminderDescription("");
        setReminderType("unique");
        setReminderScheduledDate("");
        setReminderRecurrencePattern("daily");
        setReminderRecurrenceEndDate("");
        setSelectedUserIds([]);
        
        // Ocultar el formulario después de guardar
        setShowReminderForm(false);
        
        toast.success("Recordatorio creado", {
          description: "El recordatorio ha sido creado correctamente",
        });
      }
    } catch (error) {
      console.error("Error guardando recordatorio:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al guardar recordatorio", {
        description: errorMessage,
      });
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleDeleteReminder = async (reminderId: number | string) => {
    try {
      const reminderIdStr = String(reminderId);
      
      // Buscar el recordatorio antes de eliminarlo para verificar si es de mantenimiento
      const reminderToDelete = vehicleReminders.find(
        (r) => String(r.id) === reminderIdStr || r.documentId === reminderIdStr
      );
      
      const isMaintenanceReminder = reminderToDelete?.title.toLowerCase().includes("mantenimiento") || 
                                    reminderToDelete?.title === "Mantenimiento completo del vehículo";
      
      const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderIdStr)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      setVehicleReminders((prev) => prev.filter((r) => r.id !== reminderId && r.documentId !== reminderId));
      
      // Emitir evento de eliminación
      emitReminderDeleted(reminderId);
      
      // Si es un recordatorio de mantenimiento, eliminar también el nextMaintenanceDate del vehículo
      if (isMaintenanceReminder && vehicleId) {
        try {
          const updateResponse = await fetch(`/api/fleet/${vehicleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: {
                nextMaintenanceDate: null,
              },
            }),
          });

          if (updateResponse.ok) {
            // Recargar el vehículo para actualizar la UI
            await loadVehicle();
            toast.success("Recordatorio eliminado", {
              description: "El recordatorio de mantenimiento y la fecha han sido eliminados",
            });
          } else {
            toast.success("Recordatorio eliminado", {
              description: "El recordatorio ha sido eliminado",
            });
          }
        } catch (updateError) {
          console.error("Error actualizando vehículo:", updateError);
          toast.success("Recordatorio eliminado", {
            description: "El recordatorio ha sido eliminado",
          });
        }
      } else {
        toast.success("Recordatorio eliminado", {
          description: "El recordatorio ha sido eliminado",
        });
      }
    } catch (error) {
      console.error("Error eliminando recordatorio:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar recordatorio", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleToggleReminderActive = async (reminderId: number | string, isActive: boolean) => {
    const reminderIdStr = String(reminderId);
    const newActiveState = !isActive;
    
    console.log("🔄 Cambiando estado del recordatorio:", {
      reminderId: reminderIdStr,
      currentState: isActive,
      newState: newActiveState,
    });
    
    try {
      const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderIdStr)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            isActive: newActiveState,
          },
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          errorData = errorText ? JSON.parse(errorText) : { error: "Error desconocido" };
        } catch {
          errorData = { error: `Error ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const { data } = (await response.json()) as { data: FleetReminder };
      
      console.log("✅ Recordatorio actualizado:", data);
      
      // Actualizar el estado local con el recordatorio actualizado
      setVehicleReminders((prev) => {
        const updated = prev.map((r) => {
          // Comparar por id numérico o documentId
          const matchesById = r.id && data.id && r.id === data.id;
          const matchesByDocumentId = r.documentId && data.documentId && r.documentId === data.documentId;
          const matchesByReminderId = String(r.id) === reminderIdStr || r.documentId === reminderIdStr;
          
          if (matchesById || matchesByDocumentId || matchesByReminderId) {
            console.log("🔄 Actualizando recordatorio en estado local:", {
              old: { id: r.id, documentId: r.documentId, isActive: r.isActive },
              new: { id: data.id, documentId: data.documentId, isActive: data.isActive },
            });
            return { ...data };
          }
          return r;
        });
        
        console.log("📊 Estado actualizado. Total recordatorios:", updated.length);
        return updated;
      });
      
      // Emitir evento de cambio de estado activo
      emitReminderToggleActive(reminderId, newActiveState);
      
      toast.success(newActiveState ? "Recordatorio activado" : "Recordatorio desactivado", {
        description: `El recordatorio ha sido ${newActiveState ? "activado" : "desactivado"} correctamente`,
      });
    } catch (error) {
      console.error("❌ Error cambiando estado del recordatorio:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cambiar estado", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleToggleReminderCompleted = async (reminderId: number | string, isCompleted: boolean) => {
    const reminderIdStr = String(reminderId);
    const newCompletedState = !isCompleted;
    
    console.log("🔄 Cambiando estado de completado del recordatorio:", {
      reminderId: reminderIdStr,
      currentState: isCompleted,
      newState: newCompletedState,
    });
    
    try {
      const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderIdStr)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            isCompleted: newCompletedState,
          },
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          errorData = errorText ? JSON.parse(errorText) : { error: "Error desconocido" };
        } catch {
          errorData = { error: `Error ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const { data } = (await response.json()) as { data: FleetReminder };
      
      console.log("✅ Recordatorio actualizado:", data);
      
      // Actualizar el estado local con el recordatorio actualizado
      setVehicleReminders((prev) => {
        const updated = prev.map((r) => {
          // Comparar por id numérico o documentId
          const matchesById = r.id && data.id && r.id === data.id;
          const matchesByDocumentId = r.documentId && data.documentId && r.documentId === data.documentId;
          const matchesByReminderId = String(r.id) === reminderIdStr || r.documentId === reminderIdStr;
          
          if (matchesById || matchesByDocumentId || matchesByReminderId) {
            console.log("🔄 Actualizando recordatorio en estado local:", {
              old: { id: r.id, documentId: r.documentId, isCompleted: r.isCompleted },
              new: { id: data.id, documentId: data.documentId, isCompleted: data.isCompleted },
            });
            return { ...data };
          }
          return r;
        });
        
        console.log("📊 Estado actualizado. Total recordatorios:", updated.length);
        return updated;
      });
      
      // Emitir evento de cambio de estado completado
      emitReminderToggleCompleted(reminderId, newCompletedState);
      
      toast.success(newCompletedState ? "Recordatorio marcado como completado" : "Recordatorio marcado como pendiente", {
        description: `El recordatorio ha sido ${newCompletedState ? "marcado como completado" : "marcado como pendiente"} correctamente`,
      });
    } catch (error) {
      console.error("❌ Error cambiando estado de completado del recordatorio:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cambiar estado", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleEditReminder = (reminder: FleetReminder) => {
    console.log("🔍 Editando recordatorio:", reminder);
    
    if (!reminder) {
      console.error("❌ No se recibió el recordatorio");
      return;
    }
    
    const reminderId = reminder.documentId || String(reminder.id);
    
    // Función helper para convertir fecha a formato datetime-local (hora local)
    const formatDateTimeLocal = (dateString: string): string => {
      if (!dateString) {
        console.warn("⚠️ No hay fecha programada");
        return "";
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("⚠️ Fecha inválida:", dateString);
        return "";
      }
      
      // Obtener año, mes, día, hora y minutos en hora local
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
      console.log("📅 Fecha formateada:", formatted, "de", dateString);
      return formatted;
    };
    
    // Función helper para convertir fecha a formato date (hora local)
    const formatDateLocal = (dateString: string): string => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      
      return `${year}-${month}-${day}`;
    };
    
    // Función helper para convertir hora a formato time (hora local)
    const formatTimeLocal = (dateString: string): string => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      return `${hours}:${minutes}`;
    };
    
    // Preparar todos los valores antes de actualizar los estados
    const title = reminder.title || "";
    const description = reminder.description || "";
    const type = (reminder.reminderType || "unique") as ReminderType;
    const scheduledDateValue = formatDateLocal(reminder.scheduledDate);
    const scheduledTimeValue = formatTimeLocal(reminder.scheduledDate);
    const allDayValue = scheduledTimeValue === "00:00";
    const recurrencePattern = (reminder.recurrencePattern || "daily") as RecurrencePattern;
    const recurrenceEndDate = formatDateLocal(reminder.recurrenceEndDate || "");
    
    // Mapear usuarios asignados
    const userIds = reminder.assignedUsers?.map((u) => {
      if (u.id) return u.id;
      if (u.documentId && availableUsers.length > 0) {
        const foundUser = availableUsers.find(au => au.documentId === u.documentId);
        if (foundUser?.id) return foundUser.id;
      }
      return null;
    }).filter((id): id is number => id !== null) || [];
    
    console.log("📝 Datos a llenar:", { 
      title, 
      description, 
      type, 
      scheduledDate: scheduledDateValue,
      scheduledTime: scheduledTimeValue,
      isAllDay: allDayValue,
      recurrencePattern,
      recurrenceEndDate,
      userIds 
    });
    
    // Actualizar todos los estados de una vez usando React.startTransition o simplemente en secuencia
    setEditingReminderId(reminderId);
    setReminderTitle(title);
    setReminderDescription(description);
    setReminderType(type);
    setReminderScheduledDate(scheduledDateValue);
    setReminderScheduledTime(scheduledTimeValue);
    setIsAllDay(allDayValue);
    setReminderRecurrencePattern(recurrencePattern);
    setReminderRecurrenceEndDate(recurrenceEndDate);
    setSelectedUserIds(userIds);
    
    // Mostrar el formulario al final
    setShowReminderForm(true);
    
    console.log("✅ Formulario de edición configurado");
  };
  
  // Actualizar usuarios asignados cuando availableUsers se cargue y estemos editando
  useEffect(() => {
    if (editingReminderId && availableUsers.length > 0) {
      const reminder = vehicleReminders.find(
        r => (r.documentId || String(r.id)) === editingReminderId
      );
      
      if (reminder?.assignedUsers && reminder.assignedUsers.length > 0) {
        const userIds = reminder.assignedUsers.map((u) => {
          if (u.id) return u.id;
          if (u.documentId) {
            const foundUser = availableUsers.find(au => au.documentId === u.documentId);
            if (foundUser?.id) return foundUser.id;
          }
          return null;
        }).filter((id): id is number => id !== null);
        
        setSelectedUserIds(userIds);
      }
    }
  }, [availableUsers, editingReminderId, vehicleReminders]);

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => {
      statusImagePreviewRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

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

  if (isLoading) {
    return (
      <AdminLayout title="Cargando vehículo" showFilterAction leftActions={backButton}>
        <section className={`flex flex-col ${spacing.gap.large}`}>
          {/* Skeleton del Card del Header */}
          <Card 
            className="!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
              borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
            } as React.CSSProperties}
          >
            <CardContent className={`flex flex-col items-center ${spacing.gap.base} px-12 relative`}>
              <div className="absolute top-4 right-8 flex items-center justify-end z-10">
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>

              <Skeleton className="w-full h-96 mt-20 rounded-lg" />

              <div className="flex flex-col items-center text-center">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>

          {/* Skeleton del Card de Información del Vehículo */}
          <Card 
            className="shadow-sm backdrop-blur-sm border rounded-lg"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
              borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
            } as React.CSSProperties}
          >
            <CardHeader className="px-6 pt-6 pb-4">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className={`flex items-center ${spacing.gap.medium}`}>
                    <Skeleton className="h-5 w-5 shrink-0 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skeleton del Card de Notas y Comentarios */}
          <Card 
            className="shadow-sm backdrop-blur-sm border rounded-lg"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
              borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
            } as React.CSSProperties}
          >
            <CardHeader className="px-6 pt-6 pb-4">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
              {/* Skeleton del Timeline */}
              <ScrollAreaPrimitive.Root className="relative h-[400px] overflow-hidden">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
                  <div className={`flex flex-col ${spacing.gap.base} py-2`}>
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className={`flex items-start ${spacing.gap.medium}`}>
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    ))}
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

              {/* Skeleton del Formulario */}
              <div className={`flex flex-col ${spacing.gap.small} pt-4 border-t border-border`}>
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>

          {/* Skeleton del Card de Estados del Vehículo */}
          <Card 
            className="shadow-sm backdrop-blur-sm border rounded-lg"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
              borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
            } as React.CSSProperties}
          >
            <CardHeader className="px-6 pt-6 pb-4">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
              {/* Skeleton del Timeline */}
              <ScrollAreaPrimitive.Root className="relative h-[900px] overflow-hidden">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
                  <div className={`flex flex-col ${spacing.gap.base} py-2`}>
                    {[...Array(2)].map((_, index) => (
                      <div key={index} className={`flex items-start ${spacing.gap.medium}`}>
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-48 w-full rounded-lg mb-2" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    ))}
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

              {/* Skeleton del Formulario */}
              <div className={`flex flex-col ${spacing.gap.small} pt-4 border-t border-border`}>
                <Skeleton className="h-32 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        </section>
      </AdminLayout>
    );
  }

  if (errorMessage || !vehicleData) {
    return (
      <AdminLayout title="Vehículo no disponible" showFilterAction leftActions={backButton}>
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px] text-center`}>
          <p className={typography.body.large}>{errorMessage ?? "El vehículo solicitado no existe."}</p>
          <Button
            onClick={() => router.push("/fleet")}
            size="lg"
            className="mt-4 w-full max-w-xs"
          >
            Volver a Flota
          </Button>
        </section>
      </AdminLayout>
    );
  }

  const displayImageUrl = imagePreview ?? vehicleData.imageUrl ?? null;
  const displayImageAlt = formData.imageAlt || vehicleData.imageAlt || vehicleData.name;
  const isBlobImage = Boolean(displayImageUrl && displayImageUrl.startsWith("blob:"));

  return (
    <AdminLayout title={vehicleData.name} showFilterAction leftActions={backButton}>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {!isEditing && (
          <Card 
            className="!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
              borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
            } as React.CSSProperties}
          >
            <CardContent className={`flex flex-col items-center ${spacing.gap.base} px-12 relative`}>
              <div className="absolute top-4 right-8 flex items-center justify-end z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      aria-label="Acciones"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[8rem]">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditing(true)}>
                      Editar Vehículo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer text-primary focus:text-primary hover:text-primary"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeleting}
                    >
                      Eliminar Vehículo
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative w-full h-96 mt-20 overflow-hidden rounded-lg bg-muted">
                {displayImageUrl ? (
                  <Image
                    src={displayImageUrl}
                    alt={displayImageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1200px"
                    unoptimized={isBlobImage}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center text-center">
                <h2 className={typography.h3}>{vehicleData.name}</h2>
                <div className="mt-2">{getStatusBadge(vehicleData.condition)}</div>
              </div>

              <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                  onClick={() => setIsEditing(!isEditing)}
                  aria-label="Editar vehículo"
                >
                  <Edit className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                  aria-label="Eliminar vehículo"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card 
          className="shadow-sm backdrop-blur-sm border rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
            borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
          } as React.CSSProperties}
        >
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Información del Vehículo</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {isEditing ? (
              <>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="vehicle-image-upload">Imagen del vehículo</Label>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <div className="relative flex h-96 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40">
                      {displayImageUrl ? (
                        <img src={displayImageUrl} alt={displayImageAlt} className="h-full w-full object-cover" />
                      ) : (
                        <div className={`flex flex-col items-center justify-center text-muted-foreground ${spacing.gap.small}`}>
                          <ImagePlus className="h-8 w-8" />
                          <p className={typography.body.small}>Aún no has seleccionado una imagen</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Label
                        htmlFor="vehicle-image-upload"
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Seleccionar imagen
                      </Label>
                      {(displayImageUrl || selectedImageFile || shouldRemoveImage) && (
                        <Button variant="ghost" size="sm" type="button" onClick={handleRemoveImage}>
                          Quitar imagen
                        </Button>
                      )}
                      {vehicleData.imageUrl && (selectedImageFile || shouldRemoveImage) && (
                        <Button variant="outline" size="sm" type="button" onClick={handleRestoreOriginalImage}>
                          Restaurar original
                        </Button>
                      )}
                    </div>
                    <Input
                      id="vehicle-image-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageInputChange}
                    />
                  </div>
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="imageAlt">Texto alternativo</Label>
                  <Input
                    id="imageAlt"
                    value={formData.imageAlt}
                    onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })}
                    placeholder="Ej. SUV blanco con techo panorámico"
                  />
                </div>
                <div className={`grid gap-4 md:grid-cols-2`}>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="name">Nombre del vehículo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Toyota Corolla 2020"
                    />
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="vin">VIN</Label>
                    <Input
                      id="vin"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                      placeholder="1HGBH41JXMN109186"
                    />
                  </div>
                </div>
                <div className={`grid gap-4 md:grid-cols-2`}>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="price">Precio (USD)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="pl-7"
                        placeholder="55000"
                      />
                    </div>
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="mileage">Kilometraje</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                      placeholder="35000"
                    />
                  </div>
                </div>
                <div className={`grid gap-4 md:grid-cols-2`}>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="Plata Metálico"
                    />
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="fuelType">Combustible</Label>
                    <Input
                      id="fuelType"
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                      placeholder="Gasolina"
                    />
                  </div>
                </div>
                <div className={`grid gap-4 md:grid-cols-2`}>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="transmission">Transmisión</Label>
                    <Input
                      id="transmission"
                      value={formData.transmission}
                      onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                      placeholder="Automática"
                    />
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label>Estado</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value: FleetVehicleCondition) =>
                        setFormData((prev) => ({ ...prev, condition: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="usado">Usado</SelectItem>
                        <SelectItem value="seminuevo">Seminuevo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="model">Modelo</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="year">Año</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    />
                  </div>
                </div>
                <div className={`grid gap-4 md:grid-cols-2`}>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="placa">Placa</Label>
                    <Input
                      id="placa"
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                      placeholder="Ej: ABC-123"
                      maxLength={20}
                    />
                  </div>
                </div>
                {/* Fecha y Hora Programada de Mantenimiento */}
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
                                "w-full lg:flex-1 justify-start text-left font-normal h-10 pl-3",
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
                            className="w-full sm:w-20 h-10"
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
                            className="w-full sm:w-20 h-10"
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
                            <SelectTrigger className="w-full sm:w-24 h-10">
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
                          id="maintenance-all-day"
                          checked={maintenanceIsAllDay}
                          onCheckedChange={(checked) => {
                            setMaintenanceIsAllDay(checked === true);
                            if (checked === true) {
                              setMaintenanceScheduledTime("00:00");
                            }
                          }}
                          className="h-4 w-4 border-2 border-border"
                        />
                        <Label
                          htmlFor="maintenance-all-day"
                          className="text-sm font-normal cursor-pointer select-none"
                        >
                          Todo el día
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Patrón de Recurrencia */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${spacing.gap.small}`}>
                    <div className={`flex flex-col ${spacing.gap.small}`}>
                      <Label htmlFor="maintenance-recurrence-pattern">Patrón de Recurrencia</Label>
                      <Select value={maintenanceRecurrencePattern} onValueChange={(value: RecurrencePattern) => setMaintenanceRecurrencePattern(value)}>
                        <SelectTrigger id="maintenance-recurrence-pattern">
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
                      <Label htmlFor="maintenance-recurrence-end-date">Fecha de Fin (opcional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 pl-3",
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
                {/* Mostrar responsables y conductores actuales */}
                {(vehicleData.responsables && vehicleData.responsables.length > 0) || (vehicleData.assignedDrivers && vehicleData.assignedDrivers.length > 0) || (vehicleData.interestedDrivers && vehicleData.interestedDrivers.length > 0) ? (
                  <div className={`flex flex-col ${spacing.gap.small} p-4 bg-muted/50 rounded-lg border`}>
                    <p className={`${typography.body.small} font-semibold text-muted-foreground mb-2`}>
                      Asignaciones actuales:
                    </p>
                    {vehicleData.responsables && vehicleData.responsables.length > 0 && (
                      <div className={`flex flex-col ${spacing.gap.small}`}>
                        <p className={`${typography.body.small} text-muted-foreground`}>Responsables actuales:</p>
                        <div className="flex flex-wrap gap-2">
                          {vehicleData.responsables.map((resp) => (
                            <div 
                              key={resp.id} 
                              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/users/details/${resp.documentId || resp.id}`);
                              }}
                            >
                              {resp.avatar?.url ? (
                                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                                  <Image
                                    src={strapiImages.getURL(resp.avatar.url)}
                                    alt={resp.avatar.alternativeText || resp.displayName || resp.email || `Avatar de ${resp.id}`}
                                    fill
                                    className="object-cover"
                                    sizes="24px"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background overflow-hidden">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {(resp.displayName || resp.email || `U${resp.id}`).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm">
                                {resp.displayName || resp.email || `Usuario ${resp.id}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {vehicleData.assignedDrivers && vehicleData.assignedDrivers.length > 0 && (
                      <div className={`flex flex-col ${spacing.gap.small}`}>
                        <p className={`${typography.body.small} text-muted-foreground`}>Conductores asignados actualmente:</p>
                        <div className="flex flex-wrap gap-2">
                          {vehicleData.assignedDrivers.map((driver) => (
                            <div 
                              key={driver.id} 
                              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/users/details/${driver.documentId || driver.id}`);
                              }}
                            >
                              {driver.avatar?.url ? (
                                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                                  <Image
                                    src={strapiImages.getURL(driver.avatar.url)}
                                    alt={driver.avatar.alternativeText || driver.displayName || driver.email || `Avatar de ${driver.id}`}
                                    fill
                                    className="object-cover"
                                    sizes="24px"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background overflow-hidden">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {(driver.displayName || driver.email || `U${driver.id}`).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm">
                                {driver.displayName || driver.email || `Usuario ${driver.id}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {vehicleData.interestedDrivers && vehicleData.interestedDrivers.length > 0 && (
                      <div className={`flex flex-col ${spacing.gap.small}`}>
                        <p className={`${typography.body.small} text-muted-foreground`}>Conductores interesados actualmente:</p>
                        <div className="flex flex-wrap gap-2">
                          {vehicleData.interestedDrivers.map((driver) => (
                            <div 
                              key={driver.id} 
                              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/users/details/${driver.documentId || driver.id}`);
                              }}
                            >
                              {driver.avatar?.url ? (
                                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                                  <Image
                                    src={strapiImages.getURL(driver.avatar.url)}
                                    alt={driver.avatar.alternativeText || driver.displayName || driver.email || `Avatar de ${driver.id}`}
                                    fill
                                    className="object-cover"
                                    sizes="24px"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background overflow-hidden">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {(driver.displayName || driver.email || `U${driver.id}`).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm">
                                {driver.displayName || driver.email || `Usuario ${driver.id}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
                <div className={`grid gap-4 md:grid-cols-2`}>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label>Responsable(s) del Auto</Label>
                    <MultiSelectCombobox
                      options={availableUsers.map((user) => ({
                        value: user.id,
                        label: user.displayName || user.email || "Usuario",
                        email: user.email,
                        avatar: user.avatar,
                      }))}
                      selectedValues={selectedResponsables}
                      onSelectionChange={(values) => {
                        const numericValues = values.map((v) => typeof v === 'number' ? v : Number(v)).filter((id) => !isNaN(id));
                        if (process.env.NODE_ENV === 'development') {
                          console.log("🔄 Responsables seleccionados cambiados:", {
                            values,
                            numericValues,
                            selectedResponsables,
                          });
                        }
                        setSelectedResponsables(numericValues);
                      }}
                      placeholder="Selecciona responsables..."
                      emptyMessage="No hay usuarios disponibles"
                      disabled={isLoadingUsers}
                    />
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label>Conductores asignados</Label>
                    <MultiSelectCombobox
                      options={availableUsers.map((user) => ({
                        value: user.id,
                        label: user.displayName || user.email || "Usuario",
                        email: user.email,
                        avatar: user.avatar,
                      }))}
                      selectedValues={selectedAssignedDrivers}
                      onSelectionChange={(values) => {
                        const numericValues = values.map((v) => typeof v === 'number' ? v : Number(v)).filter((id) => !isNaN(id));
                        if (process.env.NODE_ENV === 'development') {
                          console.log("🔄 Conductores seleccionados cambiados:", {
                            values,
                            numericValues,
                            selectedAssignedDrivers,
                          });
                        }
                        setSelectedAssignedDrivers(numericValues);
                      }}
                      placeholder="Selecciona conductores..."
                      emptyMessage="No hay usuarios disponibles"
                      disabled={isLoadingUsers}
                    />
                  </div>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label>Conductores interesados</Label>
                    <MultiSelectCombobox
                      options={availableUsers.map((user) => ({
                        value: user.id,
                        label: user.displayName || user.email || "Usuario",
                        email: user.email,
                        avatar: user.avatar,
                      }))}
                      selectedValues={selectedInterestedDrivers}
                      onSelectionChange={(values) => {
                        const numericValues = values.map((v) => typeof v === 'number' ? v : Number(v)).filter((id) => !isNaN(id));
                        if (process.env.NODE_ENV === 'development') {
                          console.log("🔄 Conductores interesados seleccionados cambiados:", {
                            values,
                            numericValues,
                            selectedInterestedDrivers,
                          });
                        }
                        setSelectedInterestedDrivers(numericValues);
                      }}
                      placeholder="Selecciona conductores interesados..."
                      emptyMessage="No hay usuarios disponibles"
                      disabled={isLoadingUsers}
                    />
                  </div>
                </div>
                <div className={`flex flex-col md:flex-row ${spacing.gap.small} mt-4`}>
                  <Button variant="default" size="lg" className="flex-1" onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Precio</p>
                    <p className={`${typography.body.large} font-semibold`}>{priceLabel}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>VIN</p>
                    <p className={typography.body.base}>{vehicleData.vin}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Marca</p>
                    <p className={typography.body.base}>{vehicleData.brand}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Modelo</p>
                    <p className={typography.body.base}>{vehicleData.model}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Año</p>
                    <p className={typography.body.base}>{vehicleData.year}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Estado</p>
                    <div className="mt-1">{getStatusBadge(vehicleData.condition)}</div>
                  </div>
                </div>
                {vehicleData.mileage !== undefined && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Kilometraje</p>
                      <p className={typography.body.base}>{vehicleData.mileage.toLocaleString()} km</p>
                    </div>
                  </div>
                )}
                {vehicleData.color && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Color</p>
                      <p className={typography.body.base}>{vehicleData.color}</p>
                    </div>
                  </div>
                )}
                {vehicleData.fuelType && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Combustible</p>
                      <p className={typography.body.base}>{vehicleData.fuelType}</p>
                    </div>
                  </div>
                )}
                {vehicleData.transmission && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Transmisión</p>
                      <p className={typography.body.base}>{vehicleData.transmission}</p>
                    </div>
                  </div>
                )}
                {(vehicleData as any).placa && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Placa</p>
                      <p className={typography.body.base}>{(vehicleData as any).placa}</p>
                    </div>
                  </div>
                )}
                {vehicleData.nextMaintenanceDate && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Próxima fecha de mantenimiento</p>
                      <p className={typography.body.base}>
                        {format(new Date(vehicleData.nextMaintenanceDate), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                )}
                <div className={`flex items-start ${spacing.gap.medium}`}>
                  <Car className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground mb-2`}>Conductores asignados</p>
                    {vehicleData.assignedDrivers && vehicleData.assignedDrivers.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {vehicleData.assignedDrivers.map((driver) => (
                          <div 
                            key={driver.id} 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push(`/users/details/${driver.documentId || driver.id}`)}
                          >
                            {driver.avatar?.url ? (
                              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                                <Image
                                  src={strapiImages.getURL(driver.avatar.url)}
                                  alt={driver.avatar.alternativeText || driver.displayName || driver.email || `Avatar de ${driver.id}`}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background overflow-hidden">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {(driver.displayName || driver.email || `U${driver.id}`).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium">
                              {driver.displayName || driver.email || `Usuario ${driver.id}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No hay conductores asignados</p>
                    )}
                  </div>
                </div>
                <div className={`flex items-start ${spacing.gap.medium}`}>
                  <Settings className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground mb-2`}>Responsables</p>
                    {vehicleData.responsables && vehicleData.responsables.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {vehicleData.responsables.map((resp) => (
                          <div 
                            key={resp.id} 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push(`/users/details/${resp.documentId || resp.id}`)}
                          >
                            {resp.avatar?.url ? (
                              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                                <Image
                                  src={strapiImages.getURL(resp.avatar.url)}
                                  alt={resp.avatar.alternativeText || resp.displayName || resp.email || `Avatar de ${resp.id}`}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background overflow-hidden">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {(resp.displayName || resp.email || `U${resp.id}`).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium">
                              {resp.displayName || resp.email || `Usuario ${resp.id}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No hay responsables asignados</p>
                    )}
                  </div>
                </div>
                <div className={`flex items-start ${spacing.gap.medium}`}>
                  <Car className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground mb-2`}>Conductores interesados</p>
                    {vehicleData.interestedDrivers && vehicleData.interestedDrivers.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {vehicleData.interestedDrivers.map((driver) => (
                          <div 
                            key={driver.id} 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push(`/users/details/${driver.documentId || driver.id}`)}
                          >
                            {driver.avatar?.url ? (
                              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                                <Image
                                  src={strapiImages.getURL(driver.avatar.url)}
                                  alt={driver.avatar.alternativeText || driver.displayName || driver.email || `Avatar de ${driver.id}`}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background overflow-hidden">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {(driver.displayName || driver.email || `U${driver.id}`).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium">
                              {driver.displayName || driver.email || `Usuario ${driver.id}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No hay conductores interesados</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card 
          className="shadow-sm backdrop-blur-sm border rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
            borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
          } as React.CSSProperties}
        >
          <CardHeader className="px-6 pt-6 pb-4 flex flex-row items-center justify-between">
            <CardTitle className={typography.h4}>Notas y Comentarios</CardTitle>
            {notes.length > 0 && !showNoteForm && (
              <Button
                onClick={() => setShowNoteForm(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Nota
              </Button>
            )}
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {/* Timeline de notas */}
            {notes.length > 0 && (
              <ScrollAreaPrimitive.Root className="relative h-[400px] overflow-hidden">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
                  <NotesTimeline 
                    notes={notes} 
                    isLoading={isLoadingNotes}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                    vehicleId={vehicleId}
                  />
                </ScrollAreaPrimitive.Viewport>
                <ScrollAreaPrimitive.ScrollAreaScrollbar
                  orientation="vertical"
                  className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
                >
                  <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
                </ScrollAreaPrimitive.ScrollAreaScrollbar>
                <ScrollAreaPrimitive.Corner />
              </ScrollAreaPrimitive.Root>
            )}

            {/* Estado vacío con botón + */}
            {notes.length === 0 && !showNoteForm && !isLoadingNotes && (
              <NotesTimeline 
                notes={notes} 
                isLoading={isLoadingNotes}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                vehicleId={vehicleId}
                onAddClick={() => setShowNoteForm(true)}
              />
            )}

            {/* Formulario para agregar nueva nota */}
            {showNoteForm && (
            <div className={`flex flex-col ${spacing.gap.small} ${notes.length > 0 ? 'pt-4 border-t border-border' : ''}`}>
              <Textarea
                placeholder="Añadir una nota sobre el vehículo..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="min-h-24 resize-y"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowNoteForm(false);
                    setNote("");
                  }}
                  variant="outline" 
                  size="lg" 
                  className="flex-1"
                  disabled={isSavingNote}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveNote} 
                  variant="default" 
                  size="lg" 
                  className="flex-1" 
                  disabled={!note.trim() || isSavingNote}
                >
                  {isSavingNote ? "Guardando..." : "Guardar Nota"}
                </Button>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Estados del Vehículo */}
        <Card 
          className="shadow-sm backdrop-blur-sm border rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
            borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
          } as React.CSSProperties}
        >
          <CardHeader className="px-6 pt-6 pb-4 flex flex-row items-center justify-between">
            <CardTitle className={typography.h4}>Estados del Vehículo</CardTitle>
            {vehicleStatuses.length > 0 && !showStatusForm && (
              <Button
                onClick={() => setShowStatusForm(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Estado
              </Button>
            )}
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {/* Timeline de estados */}
            {vehicleStatuses.length > 0 && (
              <ScrollAreaPrimitive.Root className="relative overflow-hidden h-[900px]">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
                  <VehicleStatusTimeline 
                    statuses={vehicleStatuses} 
                    isLoading={isLoadingStatuses}
                    loadingStatusId={loadingStatusId}
                    onEdit={handleEditStatus}
                    onDelete={handleDeleteStatus}
                    vehicleId={vehicleId}
                  />
                </ScrollAreaPrimitive.Viewport>
                <ScrollAreaPrimitive.ScrollAreaScrollbar
                  orientation="vertical"
                  className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
                >
                  <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
                </ScrollAreaPrimitive.ScrollAreaScrollbar>
                <ScrollAreaPrimitive.Corner />
              </ScrollAreaPrimitive.Root>
            )}

            {/* Estado vacío con botón + */}
            {vehicleStatuses.length === 0 && !showStatusForm && !isLoadingStatuses && (
              <VehicleStatusTimeline 
                statuses={vehicleStatuses} 
                isLoading={isLoadingStatuses}
                loadingStatusId={loadingStatusId}
                onEdit={handleEditStatus}
                onDelete={handleDeleteStatus}
                vehicleId={vehicleId}
                onAddClick={() => setShowStatusForm(true)}
              />
            )}

            {/* Formulario para agregar nuevo estado */}
            {showStatusForm && (
            <div className={`flex flex-col ${spacing.gap.small} ${vehicleStatuses.length > 0 ? 'pt-4 border-t border-border' : ''}`}>
              {/* Preview de imágenes seleccionadas */}
              {statusImagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {statusImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                          unoptimized
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveStatusImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input para seleccionar imágenes */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label
                  htmlFor="status-images-upload"
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {statusImages.length > 0 ? `Agregar más imágenes (${statusImages.length} seleccionadas)` : "Seleccionar imágenes del estado"}
                </Label>
                <Input
                  id="status-images-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleStatusImageChange}
                />
              </div>

              {/* Textarea para comentario */}
              <Textarea
                placeholder="Añadir un comentario sobre el estado del vehículo (opcional)..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={4}
                className="min-h-24 resize-y"
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowStatusForm(false);
                    setStatusImages([]);
                    setStatusImagePreviews([]);
                    setStatusComment("");
                  }}
                  variant="outline" 
                  size="lg" 
                  className="flex-1"
                  disabled={isSavingStatus}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveStatus} 
                  variant="default" 
                  size="lg" 
                  className="flex-1" 
                  disabled={(statusImages.length === 0 && !statusComment.trim()) || isSavingStatus}
                >
                  {isSavingStatus ? "Guardando..." : "Guardar Estado"}
                </Button>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Documentos del Vehículo */}
        <Card 
          className="shadow-sm backdrop-blur-sm border rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
            borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
          } as React.CSSProperties}
        >
          <CardHeader className="px-6 pt-6 pb-4 flex flex-row items-center justify-between">
            <CardTitle className={typography.h4}>Documentos del Vehículo</CardTitle>
            {vehicleDocuments.length > 0 && !showDocumentForm && (
              <Button
                onClick={() => setShowDocumentForm(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Documento
              </Button>
            )}
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {/* Lista de documentos */}
            {vehicleDocuments.length > 0 && (
              <ScrollAreaPrimitive.Root className="relative overflow-hidden h-[600px]">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
                  <FleetDocuments 
                    documents={vehicleDocuments} 
                    isLoading={isLoadingDocuments}
                    onDelete={handleDeleteDocument}
                    vehicleId={vehicleId}
                  />
                </ScrollAreaPrimitive.Viewport>
                <ScrollAreaPrimitive.ScrollAreaScrollbar
                  orientation="vertical"
                  className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
                >
                  <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
                </ScrollAreaPrimitive.ScrollAreaScrollbar>
                <ScrollAreaPrimitive.Corner />
              </ScrollAreaPrimitive.Root>
            )}

            {/* Estado vacío con botón + */}
            {vehicleDocuments.length === 0 && !showDocumentForm && !isLoadingDocuments && (
              <FleetDocuments 
                documents={vehicleDocuments} 
                isLoading={isLoadingDocuments}
                onDelete={handleDeleteDocument}
                vehicleId={vehicleId}
                onAddClick={() => setShowDocumentForm(true)}
              />
            )}

            {/* Formulario para agregar nuevo documento */}
            {showDocumentForm && (
            <div className={`flex flex-col ${spacing.gap.small} ${vehicleDocuments.length > 0 ? 'pt-4 border-t border-border' : ''}`}>
              {/* Select para tipo de documento */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label htmlFor="document-type">Tipo de Documento</Label>
                <Select value={documentType} onValueChange={(value: FleetDocumentType) => {
                  setDocumentType(value);
                  // Limpiar descripción cuando se cambia el tipo
                  if (value !== "otros") {
                    setDocumentOtherDescription("");
                  }
                }}>
                  <SelectTrigger id="document-type">
                    <SelectValue placeholder="Selecciona el tipo de documento" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="poliza_seguro">Póliza de Seguro del Vehículo</SelectItem>
                    <SelectItem value="ficha_tecnica">Ficha Técnica del Vehículo</SelectItem>
                    <SelectItem value="tarjeta_propiedad">Tarjeta de Propiedad Vehicular</SelectItem>
                    <SelectItem value="contrato_compraventa">Contrato Compraventa</SelectItem>
                    <SelectItem value="matricula_vehicular">Matrícula Vehicular Vigente</SelectItem>
                    <SelectItem value="certificado_revisado">Certificado de Revisado Vehicular</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo para describir "Otros" */}
              {documentType === "otros" && (
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="document-other-description">
                    Describe el tipo de documento <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="document-other-description"
                    type="text"
                    placeholder="Ej: Permiso de circulación, Certificado de emisiones, etc."
                    value={documentOtherDescription}
                    onChange={(e) => setDocumentOtherDescription(e.target.value)}
                    className="w-full"
                    required
                  />
                  <p className={`${typography.body.small} text-muted-foreground text-xs`}>
                    Especifica qué tipo de documento estás subiendo
                  </p>
                </div>
              )}

              {/* Preview de archivos seleccionados */}
              {documentFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {documentFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                        {file.type.startsWith("image/") ? (
                          <Image
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <FileText className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 rounded-b-lg">
                        <p className={`${typography.body.small} truncate`} title={file.name}>
                          {file.name}
                        </p>
                        <p className={`${typography.body.small} text-xs text-muted-foreground`}>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveDocumentFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input para seleccionar archivos */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label
                  htmlFor="document-files-upload"
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {documentFiles.length > 0 ? `Agregar más archivos (${documentFiles.length} seleccionados)` : "Seleccionar archivos (máx. 5MB cada uno)"}
                </Label>
                <Input
                  id="document-files-upload"
                  type="file"
                  accept="*/*"
                  multiple
                  className="sr-only"
                  onChange={handleDocumentFileChange}
                />
                <p className={`${typography.body.small} text-muted-foreground text-xs`}>
                  Puedes subir múltiples archivos. Tamaño máximo por archivo: 5MB
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowDocumentForm(false);
                    setDocumentFiles([]);
                    setDocumentType("poliza_seguro");
                    setDocumentOtherDescription("");
                  }}
                  variant="outline" 
                  size="lg" 
                  className="flex-1"
                  disabled={isSavingDocument}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveDocument} 
                  variant="default" 
                  size="lg" 
                  className="flex-1" 
                  disabled={
                    documentFiles.length === 0 || 
                    isSavingDocument ||
                    (documentType === "otros" && !documentOtherDescription.trim())
                  }
                >
                  {isSavingDocument ? "Guardando..." : "Guardar Documento"}
                </Button>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Recordatorios del Vehículo */}
        <Card 
          className="shadow-sm backdrop-blur-sm border rounded-lg"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
            borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
          } as React.CSSProperties}
        >
          <CardHeader className="px-6 pt-6 pb-4 flex flex-row items-center justify-between">
            <CardTitle className={typography.h4}>Recordatorios del Vehículo</CardTitle>
            {vehicleReminders.length > 0 && !showReminderForm && (
              <Button
                onClick={() => setShowReminderForm(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Recordatorio
              </Button>
            )}
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {/* Estado vacío con botón + */}
            {vehicleReminders.length === 0 && !showReminderForm && !isLoadingReminders && (
              <div className="flex flex-col items-center justify-center py-16 min-h-[300px] border-2 border-dashed border-border rounded-lg">
                <p className={`${typography.body.base} text-muted-foreground mb-6`}>
                  Añade un recordatorio a tu vehículo
                </p>
                <Button
                  onClick={() => setShowReminderForm(true)}
                  size="lg"
                  className="h-16 w-16 rounded-full"
                  variant="default"
                >
                  <Plus className="h-8 w-8" />
                </Button>
              </div>
            )}

            {/* Lista de recordatorios */}
            {vehicleReminders.length > 0 && (
              <ScrollAreaPrimitive.Root className="relative overflow-hidden h-[600px]">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
                  <FleetReminders 
                    reminders={vehicleReminders} 
                    isLoading={isLoadingReminders}
                    onEdit={handleEditReminder}
                    onDelete={handleDeleteReminder}
                    onToggleActive={handleToggleReminderActive}
                    onToggleCompleted={handleToggleReminderCompleted}
                    vehicleId={vehicleId}
                  />
                </ScrollAreaPrimitive.Viewport>
                <ScrollAreaPrimitive.ScrollAreaScrollbar
                  orientation="vertical"
                  className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
                >
                  <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
                </ScrollAreaPrimitive.ScrollAreaScrollbar>
                <ScrollAreaPrimitive.Corner />
              </ScrollAreaPrimitive.Root>
            )}

            {/* Formulario para agregar nuevo recordatorio */}
            {showReminderForm && (
            <div className={`flex flex-col ${spacing.gap.small} ${vehicleReminders.length > 0 ? 'pt-4 border-t border-border' : ''}`}>
              {/* Título del formulario */}
              {editingReminderId && (
                <h3 className={`${typography.h4} mb-2`}>
                  Editar Recordatorio
                </h3>
              )}
              {/* Título */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label htmlFor="reminder-title">Título del Recordatorio</Label>
                <Input
                  id="reminder-title"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Ej: Revisar mantenimiento"
                />
              </div>

              {/* Descripción */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label htmlFor="reminder-description">Descripción (opcional)</Label>
                <Textarea
                  id="reminder-description"
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder="Añade una descripción del recordatorio..."
                  rows={3}
                  className="min-h-20 resize-y"
                />
              </div>

              {/* Tipo de recordatorio y Fecha programada en dos columnas */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${spacing.gap.small}`}>
                {/* Tipo de recordatorio */}
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="reminder-type">Tipo de Recordatorio</Label>
                  <Select value={reminderType} onValueChange={(value: ReminderType) => setReminderType(value)}>
                    <SelectTrigger id="reminder-type">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent align="end" side="bottom" avoidCollisions={false}>
                      <SelectItem value="unique">Único</SelectItem>
                      <SelectItem value="recurring">Recurrente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha programada */}
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="reminder-scheduled-date">Fecha y Hora Programada</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col lg:flex-row gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full lg:flex-1 justify-start text-left font-normal h-10 pl-3",
                              !reminderScheduledDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {reminderScheduledDate ? (
                              format(new Date(reminderScheduledDate + "T00:00:00"), "d 'de' MMMM, yyyy", { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={reminderScheduledDate ? new Date(reminderScheduledDate + "T00:00:00") : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, "0");
                                const day = String(date.getDate()).padStart(2, "0");
                                setReminderScheduledDate(`${year}-${month}-${day}`);
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
                            if (!reminderScheduledTime) return "";
                            const [hours] = reminderScheduledTime.split(":");
                            const hour24 = parseInt(hours, 10);
                            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                            return hour12.toString();
                          })()}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Validar que esté entre 1 y 12
                            if (value === "" || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 12)) {
                              const currentMinutes = reminderScheduledTime ? reminderScheduledTime.split(":")[1] || "00" : "00";
                              const currentHour24 = reminderScheduledTime ? parseInt(reminderScheduledTime.split(":")[0], 10) : 0;
                              const isPM = currentHour24 >= 12;
                              
                              if (value === "") {
                                setReminderScheduledTime(`00:${currentMinutes}`);
                              } else {
                                const hour12 = parseInt(value, 10);
                                const hour24 = hour12 === 12 ? (isPM ? 12 : 0) : (isPM ? hour12 + 12 : hour12);
                                setReminderScheduledTime(`${String(hour24).padStart(2, "0")}:${currentMinutes}`);
                              }
                              if (!reminderScheduledTime) {
                                setIsAllDay(false);
                              }
                            }
                          }}
                          placeholder="Hora"
                          disabled={isAllDay}
                          className="w-full sm:w-20 h-10"
                        />
                        <span className="text-muted-foreground hidden sm:inline">:</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={(() => {
                            if (!reminderScheduledTime) return "";
                            return reminderScheduledTime.split(":")[1] || "00";
                          })()}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Validar que esté entre 0 y 59
                            if (value === "" || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 59)) {
                              const hours = reminderScheduledTime ? reminderScheduledTime.split(":")[0] : "00";
                              const minutes = value === "" ? "00" : String(parseInt(value, 10)).padStart(2, "0");
                              setReminderScheduledTime(`${hours}:${minutes}`);
                            }
                          }}
                          placeholder="Min"
                          disabled={isAllDay}
                          className="w-full sm:w-20 h-10"
                        />
                        <Select
                          value={(() => {
                            if (!reminderScheduledTime) return "AM";
                            const hour24 = parseInt(reminderScheduledTime.split(":")[0], 10);
                            return hour24 >= 12 ? "PM" : "AM";
                          })()}
                          onValueChange={(value) => {
                            const [hours, minutes] = reminderScheduledTime ? reminderScheduledTime.split(":") : ["0", "00"];
                            const hour24 = parseInt(hours, 10);
                            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                            const newHour24 = value === "PM" 
                              ? (hour12 === 12 ? 12 : hour12 + 12)
                              : (hour12 === 12 ? 0 : hour12);
                            setReminderScheduledTime(`${String(newHour24).padStart(2, "0")}:${minutes || "00"}`);
                          }}
                          disabled={isAllDay}
                        >
                          <SelectTrigger className="w-full sm:w-24 h-10">
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
                        id="reminder-all-day"
                        checked={isAllDay}
                        onCheckedChange={(checked) => {
                          setIsAllDay(checked === true);
                          if (checked === true) {
                            setReminderScheduledTime("00:00");
                          }
                        }}
                        className="h-4 w-4 border-2 border-border"
                      />
                      <Label
                        htmlFor="reminder-all-day"
                        className="text-sm font-normal cursor-pointer select-none"
                      >
                        Todo el día
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos para recordatorios recurrentes */}
              {reminderType === "recurring" && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${spacing.gap.small}`}>
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="reminder-recurrence-pattern">Patrón de Recurrencia</Label>
                    <Select value={reminderRecurrencePattern} onValueChange={(value: RecurrencePattern) => setReminderRecurrencePattern(value)}>
                      <SelectTrigger id="reminder-recurrence-pattern">
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

                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label htmlFor="reminder-recurrence-end-date">Fecha de Finalización (opcional)</Label>
                    <Input
                      id="reminder-recurrence-end-date"
                      type="date"
                      value={reminderRecurrenceEndDate}
                      onChange={(e) => setReminderRecurrenceEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Selector de usuarios asignados */}
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Label>Usuarios Asignados</Label>
                {isLoadingUsers ? (
                  <div className="border rounded-lg p-4">
                    <p className={typography.body.small}>Cargando usuarios...</p>
                  </div>
                ) : (
                  <MultiSelectCombobox
                    options={availableUsers.map((user) => ({
                      value: user.id,
                      label: user.displayName || user.email || "Usuario",
                      email: user.email,
                      avatar: user.avatar,
                    }))}
                    selectedValues={selectedUserIds}
                    onSelectionChange={(values) => setSelectedUserIds(values as number[])}
                    placeholder="Selecciona usuarios..."
                    searchPlaceholder="Buscar usuarios..."
                    emptyMessage="No se encontraron usuarios."
                    disabled={isSavingReminder}
                  />
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => {
                    setShowReminderForm(false);
                    setReminderTitle("");
                    setReminderDescription("");
                    setReminderScheduledDate("");
                    setReminderScheduledTime("");
                    setIsAllDay(false);
                    setReminderType("unique");
                    setReminderRecurrencePattern("daily");
                    setReminderRecurrenceEndDate("");
                    setSelectedUserIds([]);
                    setEditingReminderId(null);
                  }}
                  variant="outline" 
                  size="lg" 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveReminder} 
                  variant="default" 
                  size="lg" 
                  className="flex-1"  
                  disabled={!reminderTitle?.trim() || !reminderScheduledDate || !selectedUserIds || selectedUserIds.length === 0 || isSavingReminder}
                >
                  {isSavingReminder 
                    ? (editingReminderId ? "Actualizando..." : "Guardando...") 
                    : (editingReminderId ? "Actualizar Recordatorio" : "Crear Recordatorio")}
                </Button>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </section>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClose={() => setIsDeleteDialogOpen(false)}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este vehículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el vehículo de la flota y no se podrá deshacer. Confirma si deseas continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
