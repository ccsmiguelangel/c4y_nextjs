"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Edit2, Trash2, X, Check } from "lucide-react";
import Image from "next/image";
import { Card } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { typography, spacing } from "@/lib/design-system";
import { strapiImages } from "@/lib/strapi-images";

export interface FleetNote {
  id: number;
  documentId?: string;
  content: string;
  authorDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  };
}

interface NotesTimelineProps {
  notes: FleetNote[];
  isLoading?: boolean;
  onEdit?: (noteId: number | string, editContent: string) => Promise<void>;
  onDelete?: (noteId: number | string) => Promise<void>;
  vehicleId: string;
}

function NoteItem({
  note,
  isLast,
  onEdit,
  onDelete,
  vehicleId,
}: {
  note: FleetNote;
  isLast: boolean;
  onEdit?: (noteId: number | string, editContent: string) => Promise<void>;
  onDelete?: (noteId: number | string) => Promise<void>;
  vehicleId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const date = new Date(note.createdAt);
  const updatedDate = new Date(note.updatedAt);
  const isEdited = note.createdAt !== note.updatedAt;
  const formattedDate = format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  const formattedUpdatedDate = format(updatedDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  // Obtener el nombre del autor: displayName > email > "Usuario"
  const authorName = note.author?.displayName || note.author?.email || "Usuario";
  const noteId = note.documentId || String(note.id);
  
  // Log para debugging
  if (!note.documentId) {
    console.warn("⚠️ Nota sin documentId:", {
      id: note.id,
      documentId: note.documentId,
      content: note.content?.substring(0, 50),
    });
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !onEdit) return;
    setIsSaving(true);
    try {
      console.log("📝 Guardando edición de nota:", {
        noteId,
        tipo: typeof noteId,
        tieneDocumentId: !!note.documentId,
        id: note.id,
        documentId: note.documentId,
      });
      await onEdit(noteId, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Error guardando edición:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(noteId);
    } catch (error) {
      console.error("Error eliminando nota:", error);
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

      {/* Contenido de la nota */}
      <div className="flex-1 pb-6">
        <Card className="shadow-sm ring-1 ring-inset ring-border/50 relative">
          {/* Iconos de editar/eliminar */}
          {!isEditing && (onEdit || onDelete) && (
            <div className="absolute top-2 right-2 flex gap-1">
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
              {note.author?.avatar?.url ? (
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                  <Image
                    src={strapiImages.getURL(note.author.avatar.url)}
                    alt={note.author.avatar.alternativeText || authorName}
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
            
            {isEditing ? (
              <div className={`flex flex-col ${spacing.gap.small}`}>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="min-h-20 resize-y"
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
                    disabled={!editContent.trim() || isSaving}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className={`${typography.body.base} whitespace-pre-wrap break-words`}>
                {note.content}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function NotesTimeline({ notes, isLoading, onEdit, onDelete, vehicleId }: NotesTimelineProps) {
  if (isLoading) {
    return (
      <div className={`flex flex-col ${spacing.gap.small} py-4`}>
        <p className={typography.body.small}>Cargando notas...</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${spacing.gap.small} py-8 text-center`}>
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
        <p className={typography.body.small}>Aún no hay notas para este vehículo</p>
        <p className={`${typography.body.small} text-muted-foreground`}>
          Sé el primero en agregar una nota
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${spacing.gap.base} py-2`}>
      {notes.map((note, index) => {
        const isLast = index === notes.length - 1;
        return (
          <NoteItem
            key={note.id || note.documentId}
            note={note}
            isLast={isLast}
            onEdit={onEdit}
            onDelete={onDelete}
            vehicleId={vehicleId}
          />
        );
      })}
    </div>
  );
}

