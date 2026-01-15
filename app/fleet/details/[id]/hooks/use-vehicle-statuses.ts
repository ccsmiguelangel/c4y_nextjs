import { useCallback, useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { toast } from "@/lib/toast";
import type { VehicleStatus } from "@/validations/types";

interface UseVehicleStatusesReturn {
  vehicleStatuses: VehicleStatus[];
  isLoadingStatuses: boolean;
  isSavingStatus: boolean;
  loadingStatusId: string | number | null;
  statusComment: string;
  statusImages: File[];
  statusImagePreviews: string[];
  showStatusForm: boolean;
  setStatusComment: (comment: string) => void;
  loadVehicleStatuses: () => Promise<void>;
  handleStatusImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveStatusImage: (index: number) => void;
  handleSaveStatus: (currentUserDocumentId: string | null, loadCurrentUserProfile: () => Promise<void>) => Promise<void>;
  handleEditStatus: (statusId: number | string, editComment: string, imageIds?: number[], newImages?: File[]) => Promise<void>;
  handleDeleteStatus: (statusId: number | string) => Promise<void>;
  handleOpenStatusForm: () => void;
  handleCancelStatusForm: () => void;
  setVehicleStatuses: React.Dispatch<React.SetStateAction<VehicleStatus[]>>;
}

export function useVehicleStatuses(vehicleId: string): UseVehicleStatusesReturn {
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleStatus[]>([]);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [loadingStatusId, setLoadingStatusId] = useState<string | number | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [statusImages, setStatusImages] = useState<File[]>([]);
  const [statusImagePreviews, setStatusImagePreviews] = useState<string[]>([]);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const statusImagePreviewRefs = useRef<string[]>([]);

  const handleOpenStatusForm = () => setShowStatusForm(true);
  
  const handleCancelStatusForm = () => {
    setShowStatusForm(false);
    setStatusImages([]);
    setStatusImagePreviews([]);
    statusImagePreviewRefs.current.forEach((url) => URL.revokeObjectURL(url));
    statusImagePreviewRefs.current = [];
    setStatusComment("");
  };

  const loadVehicleStatuses = useCallback(async () => {
    setIsLoadingStatuses(true);
    try {
      const response = await fetch(`/api/fleet/${vehicleId}/status`, { cache: "no-store" });
      if (!response.ok) {
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
      setVehicleStatuses([]);
    } finally {
      setIsLoadingStatuses(false);
    }
  }, [vehicleId]);

  const handleStatusImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

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

  const handleSaveStatus = async (currentUserDocumentId: string | null, loadCurrentUserProfile: () => Promise<void>) => {
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
    try {
      const uploadedImageIds: number[] = [];
      for (const imageFile of statusImages) {
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(imageFile.type)) {
          throw new Error(`Tipo de archivo no válido. Solo se permiten imágenes: ${validImageTypes.join(', ')}`);
        }
        
        const maxSize = 10 * 1024 * 1024;
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
            // Usar mensaje por defecto
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
        
        if (response.status === 405) {
          throw new Error("El método POST no está permitido en esta ruta. Por favor, reinicia el servidor de desarrollo.");
        }
        
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const { data: createdStatus } = (await response.json()) as { data: VehicleStatus };
      const statusId = createdStatus.documentId || createdStatus.id;
      
      setVehicleStatuses((prev) => [createdStatus, ...prev]);
      setLoadingStatusId(statusId);
      
      setStatusComment("");
      setStatusImages([]);
      setStatusImagePreviews([]);
      setShowStatusForm(false);
      statusImagePreviewRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      statusImagePreviewRefs.current = [];
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      try {
        const getResponse = await fetch(`/api/fleet/${vehicleId}/status`, { cache: "no-store" });
        if (getResponse.ok) {
          const { data: allStatuses } = (await getResponse.json()) as { data: VehicleStatus[] };
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
            await loadVehicleStatuses();
          }
        } else {
          await loadVehicleStatuses();
        }
      } catch {
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

  useEffect(() => {
    loadVehicleStatuses();
  }, [loadVehicleStatuses]);

  useEffect(() => {
    return () => {
      statusImagePreviewRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  return {
    vehicleStatuses,
    isLoadingStatuses,
    isSavingStatus,
    loadingStatusId,
    statusComment,
    statusImages,
    statusImagePreviews,
    showStatusForm,
    setStatusComment,
    loadVehicleStatuses,
    handleStatusImageChange,
    handleRemoveStatusImage,
    handleSaveStatus,
    handleEditStatus,
    handleDeleteStatus,
    handleOpenStatusForm,
    handleCancelStatusForm,
    setVehicleStatuses,
  };
}

