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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
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
import { NotesTimeline, type FleetNote } from "@/components/ui/notes-timeline";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import type {
  FleetVehicleCard,
  FleetVehicleCondition,
  FleetVehicleUpdatePayload,
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
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notes, setNotes] = useState<FleetNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [currentUserDocumentId, setCurrentUserDocumentId] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
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
    (data: FleetVehicleCard) => {
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
      });
      updateImagePreview(data.imageUrl ?? null);
      setSelectedImageFile(null);
      setShouldRemoveImage(false);
    },
    [updateImagePreview]
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
      setVehicleData(data);
      syncFormWithVehicle(data);
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

  useEffect(() => {
    loadVehicle();
    loadNotes();
    loadCurrentUserProfile();
  }, [vehicleId, syncFormWithVehicle, loadNotes, loadCurrentUserProfile]);

  const handleSaveChanges = async () => {
    if (!vehicleData) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      let uploadedImageId: number | null = null;
      if (selectedImageFile) {
        const uploadForm = new FormData();
        uploadForm.append("files", selectedImageFile);
        const uploadResponse = await fetch("/api/strapi/upload", {
          method: "POST",
          body: uploadForm,
        });
        if (!uploadResponse.ok) {
          throw new Error("upload_failed");
        }
        const uploadPayload = (await uploadResponse.json()) as { data?: { id?: number } };
        uploadedImageId = uploadPayload?.data?.id ?? null;
        if (!uploadedImageId) {
          throw new Error("upload_failed");
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
      };

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
        throw new Error("save_failed");
      }

      const { data } = (await response.json()) as { data: FleetVehicleCard };
      setVehicleData(data);
      syncFormWithVehicle(data);
      setIsEditing(false);
    } catch (error) {
      console.error("Error guardando vehículo:", error);
      const uploadFailed = (error as Error)?.message === "upload_failed";
      setErrorMessage(
        uploadFailed
          ? "No pudimos subir la imagen. Verifica el archivo e intenta nuevamente."
          : "No pudimos guardar los cambios. Intenta nuevamente."
      );
    } finally {
      setIsSaving(false);
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
                      className="cursor-pointer text-destructive focus:text-destructive hover:text-destructive"
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
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Notas y Comentarios</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {/* Timeline de notas */}
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

            {/* Formulario para agregar nueva nota */}
            <div className={`flex flex-col ${spacing.gap.small} pt-4 border-t border-border`}>
              <Textarea
                placeholder="Añadir una nota sobre el vehículo..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="min-h-24 resize-y"
              />
              <Button 
                onClick={handleSaveNote} 
                variant="default" 
                size="lg" 
                className="w-full" 
                disabled={!note.trim() || isSavingNote}
              >
                {isSavingNote ? "Guardando..." : "Guardar Nota"}
              </Button>
            </div>
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
