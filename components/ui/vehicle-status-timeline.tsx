"use client";

import { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Camera, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { Card } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import { typography, spacing } from "@/lib/design-system";
import { strapiImages } from "@/lib/strapi-images";
import type { VehicleStatus } from "@/validations/types";

export interface VehicleStatusTimelineProps {
  statuses: VehicleStatus[];
  isLoading?: boolean;
  loadingStatusId?: string | number | null;
  onEdit?: (statusId: number | string, editComment: string, imageIds?: number[], newImages?: File[]) => Promise<void>;
  onDelete?: (statusId: number | string) => Promise<void>;
  vehicleId: string;
  onAddClick?: () => void;
}

function StatusItem({
  status,
  isLast,
  isLoading,
  onEdit,
  onDelete,
  vehicleId,
}: {
  status: VehicleStatus;
  isLast: boolean;
  isLoading?: boolean;
  onEdit?: (statusId: number | string, editComment: string, imageIds?: number[], newImages?: File[]) => Promise<void>;
  onDelete?: (statusId: number | string) => Promise<void>;
  vehicleId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState(status.comment || "");
  const [editImages, setEditImages] = useState<Array<{ id?: number; url?: string; alternativeText?: string }>>(status.images || []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const newImagePreviewRefs = useRef<string[]>([]);

  const date = new Date(status.createdAt);
  const updatedDate = new Date(status.updatedAt);
  const isEdited = status.createdAt !== status.updatedAt;
  const formattedDate = format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  const formattedUpdatedDate = format(updatedDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  const authorName = status.author?.displayName || status.author?.email || "Usuario";
  const statusId = status.documentId || String(status.id);
  const images = status.images || [];
  const hasImages = images.length > 0;

  // Sincronizar editImages cuando el status cambia desde fuera
  useEffect(() => {
    if (!isEditing) {
      setEditComment(status.comment || "");
      setEditImages(status.images || []);
      // Limpiar nuevas imágenes cuando se cancela o guarda
      newImagePreviewRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      newImagePreviewRefs.current = [];
      setNewImages([]);
      setNewImagePreviews([]);
    }
  }, [status.comment, status.images, isEditing]);

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => {
      newImagePreviewRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const scrollPrev = () => {
    emblaApi?.scrollPrev();
  };

  const scrollNext = () => {
    emblaApi?.scrollNext();
  };

  useEffect(() => {
    if (!emblaApi || isLoading) return;

    const onSelect = () => {
      setPrevBtnDisabled(!emblaApi.canScrollPrev());
      setNextBtnDisabled(!emblaApi.canScrollNext());
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, isLoading]);
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <div className="relative flex gap-4">
        {!isLast && (
          <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
        )}
        <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <div className="flex-1 pb-6">
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <div className={`flex flex-col ${spacing.gap.small} p-4`}>
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const handleSaveEdit = async () => {
    if (!editComment.trim() && editImages.length === 0 && newImages.length === 0) return;
    if (!onEdit) return;
    setIsSaving(true);
    try {
      const imageIds = editImages.map(img => img.id).filter((id): id is number => id !== undefined);
      await onEdit(statusId, editComment.trim(), imageIds, newImages.length > 0 ? newImages : undefined);
      setIsEditing(false);
    } catch (error) {
      console.error("Error guardando edición:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditComment(status.comment || "");
    setEditImages(status.images || []);
    // Limpiar nuevas imágenes
    newImagePreviewRefs.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    newImagePreviewRefs.current = [];
    setNewImages([]);
    setNewImagePreviews([]);
    setIsEditing(false);
  };

  const handleRemoveImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    // Revocar URL del preview
    const urlToRevoke = newImagePreviewRefs.current[index];
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke);
    }
    // Remover de arrays
    newImagePreviewRefs.current = newImagePreviewRefs.current.filter((_, i) => i !== index);
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newPreviews: string[] = [];
    files.forEach((file) => {
      const objectUrl = URL.createObjectURL(file);
      newPreviews.push(objectUrl);
      newImagePreviewRefs.current.push(objectUrl);
    });

    setNewImages(prev => [...prev, ...files]);
    setNewImagePreviews(prev => [...prev, ...newPreviews]);
    
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    event.target.value = '';
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(statusId);
    } catch (error) {
      console.error("Error eliminando estado:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative flex gap-4">
      {/* Línea vertical del timeline */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
      )}
      
      {/* Punto del timeline */}
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
        <div className="h-2 w-2 rounded-full bg-primary" />
      </div>

      {/* Contenido del estado */}
      <div className="flex-1 pb-6">
        <Card className="shadow-sm ring-1 ring-inset ring-border/50 relative">
          {/* Iconos de editar/eliminar */}
          {!isEditing && (onEdit || onDelete) && (
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                  disabled={isDeleting}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          <div className={`flex flex-col ${spacing.gap.small} p-4 ${onEdit || onDelete ? "pr-12" : ""}`}>
            <div className="flex items-start gap-3">
              {/* Avatar del autor */}
              {status.author?.avatar?.url ? (
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                  <Image
                    src={strapiImages.getURL(status.author.avatar.url)}
                    alt={status.author.avatar.alternativeText || authorName}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
                  <span className={`${typography.body.small} font-semibold text-primary`}>
                    {authorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className={`${typography.body.small} font-semibold`}>
                  {authorName}
                </p>
                <p className={`${typography.body.small} text-muted-foreground`}>
                  {formattedDate}
                  {isEdited && (
                    <span className="ml-2 text-xs italic">
                      (editado el {formattedUpdatedDate})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Imágenes: Grid en modo edición, Carousel en modo visualización */}
            {isEditing ? (
              // Grid de imágenes en modo edición (existentes + nuevas)
              (editImages.length > 0 || newImagePreviews.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Imágenes existentes */}
                  {editImages.map((image, index) => (
                    <div key={`existing-${index}`} className="relative group">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        {image.url ? (
                          <Image
                            src={strapiImages.getURL(image.url)}
                            alt={image.alternativeText || `Imagen ${index + 1} del estado del vehículo`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Camera className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                        disabled={isSaving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {/* Nuevas imágenes seleccionadas */}
                  {newImagePreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={preview}
                          alt={`Nueva imagen ${index + 1}`}
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
                        onClick={() => handleRemoveNewImage(index)}
                        disabled={isSaving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Carousel de imágenes en modo visualización
              hasImages && (
                <div className="relative w-full">
                  <div className="overflow-hidden rounded-lg" ref={emblaRef}>
                    <div className="flex">
                      {images.map((image, index) => (
                        <div key={index} className="relative min-w-0 flex-[0_0_100%]">
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                            {image.url ? (
                              <Image
                                src={strapiImages.getURL(image.url)}
                                alt={image.alternativeText || `Imagen ${index + 1} del estado del vehículo`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 800px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Camera className="h-12 w-12" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Botones de navegación del carousel */}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                        onClick={scrollPrev}
                        disabled={prevBtnDisabled}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                        onClick={scrollNext}
                        disabled={nextBtnDisabled}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Indicadores de posición */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, index) => (
                          <div
                            key={index}
                            className={`h-1.5 w-1.5 rounded-full transition-all ${
                              index === selectedIndex
                                ? "bg-background w-4"
                                : "bg-background/60"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            )}
            
            {/* Comentario */}
            {isEditing ? (
              <div className={`flex flex-col ${spacing.gap.small}`}>
                {/* Input para agregar nuevas imágenes */}
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label
                    htmlFor={`status-edit-images-${statusId}`}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {newImages.length > 0 ? `Agregar más imágenes (${newImages.length} nuevas seleccionadas)` : "Agregar imágenes"}
                  </Label>
                  <Input
                    id={`status-edit-images-${statusId}`}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleNewImageChange}
                    disabled={isSaving}
                  />
                </div>

                <Textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={3}
                  className="min-h-20 resize-y"
                  placeholder="Añade un comentario sobre el estado del vehículo..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={(!editComment.trim() && editImages.length === 0 && newImages.length === 0) || isSaving}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : (
              status.comment && (
                <p className={`${typography.body.base} whitespace-pre-wrap break-words`}>
                  {status.comment}
                </p>
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function VehicleStatusTimeline({ statuses, isLoading, loadingStatusId, onEdit, onDelete, vehicleId, onAddClick }: VehicleStatusTimelineProps) {
  if (isLoading) {
    return (
      <div className={`flex flex-col ${spacing.gap.small} py-4`}>
        <p className={typography.body.small}>Cargando estados...</p>
      </div>
    );
  }

  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 min-h-[300px] border-2 border-dashed border-border rounded-lg">
        <p className={`${typography.body.base} text-muted-foreground mb-6`}>
          Añade un estado a tu vehículo
        </p>
        {onAddClick && (
          <Button
            onClick={onAddClick}
            size="lg"
            className="h-16 w-16 rounded-full"
            variant="default"
          >
            <Plus className="h-8 w-8" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${spacing.gap.base} py-2`}>
      {statuses.map((status, index) => {
        const isLast = index === statuses.length - 1;
        const statusId = status.documentId || String(status.id);
        const isStatusLoading = loadingStatusId !== null && (
          (typeof loadingStatusId === 'string' && statusId === loadingStatusId) ||
          (typeof loadingStatusId === 'number' && String(status.id) === String(loadingStatusId))
        );
        return (
          <StatusItem
            key={status.id || status.documentId}
            status={status}
            isLast={isLast}
            isLoading={isStatusLoading}
            onEdit={onEdit}
            onDelete={onDelete}
            vehicleId={vehicleId}
          />
        );
      })}
    </div>
  );
}
