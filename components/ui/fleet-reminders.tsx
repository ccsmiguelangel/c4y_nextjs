"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, Trash2, Edit2, Calendar, Repeat, CalendarCheck, X, Check, Users, Pause } from "lucide-react";
import Image from "next/image";
import { Card } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import { typography, spacing } from "@/lib/design-system";
import { strapiImages } from "@/lib/strapi-images";
import type { FleetReminder } from "@/validations/types";

export interface FleetRemindersProps {
  reminders: FleetReminder[];
  isLoading?: boolean;
  onEdit?: (reminder: FleetReminder) => void;
  onDelete?: (reminderId: number | string) => Promise<void>;
  onToggleActive?: (reminderId: number | string, isActive: boolean) => Promise<void>;
  vehicleId: string;
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

function ReminderItem({
  reminder,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  reminder: FleetReminder;
  onEdit?: (reminder: FleetReminder) => void;
  onDelete?: (reminderId: number | string) => Promise<void>;
  onToggleActive?: (reminderId: number | string, isActive: boolean) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const reminderId = reminder.documentId || String(reminder.id);
  const scheduledDate = new Date(reminder.scheduledDate);
  const nextTriggerDate = new Date(reminder.nextTrigger);
  
  // Función helper para convertir hora 24h a formato 12h AM/PM
  const formatTime12Hour = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours >= 12 ? "PM" : "AM";
    const minutesStr = String(minutes).padStart(2, "0");
    return `${hour12}:${minutesStr} ${period}`;
  };
  
  // Detectar si es "todo el día" (hora es 00:00)
  const isScheduledAllDay = scheduledDate.getHours() === 0 && scheduledDate.getMinutes() === 0;
  const isNextTriggerAllDay = nextTriggerDate.getHours() === 0 && nextTriggerDate.getMinutes() === 0;
  
  // Formatear fecha: mostrar "todo el día" si la hora es 00:00, sino mostrar fecha y hora en formato AM/PM
  const formattedScheduledDate = isScheduledAllDay
    ? `${format(scheduledDate, "d 'de' MMMM, yyyy", { locale: es })} - todo el día`
    : `${format(scheduledDate, "d 'de' MMMM, yyyy 'a las'", { locale: es })} ${formatTime12Hour(scheduledDate)}`;
  
  const formattedNextTrigger = isNextTriggerAllDay
    ? `${format(nextTriggerDate, "d 'de' MMMM, yyyy", { locale: es })} - todo el día`
    : `${format(nextTriggerDate, "d 'de' MMMM, yyyy 'a las'", { locale: es })} ${formatTime12Hour(nextTriggerDate)}`;
  
  const authorName = reminder.author?.displayName || reminder.author?.email || "Usuario";

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(reminderId);
    } catch (error) {
      console.error("Error eliminando recordatorio:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!onToggleActive) {
      console.warn("⚠️ onToggleActive no está definido");
      return;
    }
    
    console.log("🔄 Toggle activo clickeado:", {
      reminderId,
      currentState: reminder.isActive,
      newState: !reminder.isActive,
    });
    
    setIsToggling(true);
    try {
      await onToggleActive(reminderId, reminder.isActive);
      console.log("✅ Estado cambiado exitosamente");
    } catch (error) {
      console.error("❌ Error cambiando estado del recordatorio:", error);
      // El error ya se maneja en la función padre con toast
    } finally {
      setIsToggling(false);
    }
  };

  const handleEdit = () => {
    console.log("✏️ Botón editar clickeado, recordatorio:", reminder);
    if (onEdit) {
      console.log("✅ Llamando a onEdit con:", reminder);
      onEdit(reminder);
    } else {
      console.warn("⚠️ onEdit no está definido");
    }
  };

  return (
    <Card className="shadow-sm ring-1 ring-inset ring-border/50 relative">
      {/* Iconos de acciones */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleEdit}
            disabled={isDeleting || isToggling}
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
        {onToggleActive && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleToggleActive}
            disabled={isDeleting || isToggling}
            title={reminder.isActive ? "Desactivar" : "Activar"}
          >
            {reminder.isActive ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Pause className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting || isToggling}
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className={`flex flex-col ${spacing.gap.small} p-4 ${onEdit || onDelete ? "pr-12" : ""}`}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-background ${
            reminder.isActive ? "bg-primary/10" : "bg-muted"
          }`}>
            {reminder.reminderType === "recurring" ? (
              <Repeat className={`h-4 w-4 ${reminder.isActive ? "text-primary" : "text-muted-foreground"}`} />
            ) : (
              <Bell className={`h-4 w-4 ${reminder.isActive ? "text-primary" : "text-muted-foreground"}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`${typography.body.small} font-semibold`}>
                {reminder.title}
              </p>
              <Badge variant={reminder.isActive ? "default" : "secondary"} className="text-xs">
                {reminder.isActive ? "Activo" : "Inactivo"}
              </Badge>
              {reminder.reminderType === "recurring" && (
                <Badge variant="outline" className="text-xs">
                  {RECURRENCE_LABELS[reminder.recurrencePattern || ""] || "Recurrente"}
                </Badge>
              )}
            </div>
            <p className={`${typography.body.small} text-muted-foreground`}>
              Creado por {authorName}
            </p>
          </div>
        </div>

        {/* Descripción */}
        {reminder.description && (
          <p className={`${typography.body.base} text-muted-foreground`}>
            {reminder.description}
          </p>
        )}

        {/* Fechas */}
        <div className={`flex flex-col ${spacing.gap.small} pt-2 border-t border-border`}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className={`${typography.body.small} text-muted-foreground`}>
                Fecha programada:
              </p>
              <p className={typography.body.small}>
                {formattedScheduledDate}
              </p>
            </div>
          </div>
          
          {/* Mostrar próxima notificación solo para recordatorios recurrentes */}
          {reminder.reminderType === "recurring" && (
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className={`${typography.body.small} text-muted-foreground`}>
                  Próxima notificación:
                </p>
                <p className={typography.body.small}>
                  {formattedNextTrigger}
                </p>
              </div>
            </div>
          )}

          {reminder.reminderType === "recurring" && reminder.recurrenceEndDate && (
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className={`${typography.body.small} text-muted-foreground`}>
                  Finaliza:
                </p>
                <p className={typography.body.small}>
                  {format(new Date(reminder.recurrenceEndDate), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Usuarios asignados */}
        {reminder.assignedUsers && reminder.assignedUsers.length > 0 && (
          <div className={`flex flex-col ${spacing.gap.small} pt-2 border-t border-border`}>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className={`${typography.body.small} text-muted-foreground`}>
                Usuarios asignados:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {reminder.assignedUsers.map((user) => (
                <div key={user.id || user.documentId} className="flex items-center gap-2">
                  {user.avatar?.url ? (
                    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-2 ring-background">
                      <Image
                        src={strapiImages.getURL(user.avatar.url)}
                        alt={user.avatar.alternativeText || user.displayName || user.email || "Usuario"}
                        fill
                        className="object-cover"
                        sizes="24px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
                      <span className={`${typography.body.small} font-semibold text-primary text-xs`}>
                        {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className={`${typography.body.small} text-xs`}>
                    {user.displayName || user.email || "Usuario"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function FleetReminders({ reminders, isLoading, onEdit, onDelete, onToggleActive, vehicleId }: FleetRemindersProps) {
  if (isLoading) {
    return (
      <div className={`flex flex-col ${spacing.gap.small} py-4`}>
        <p className={typography.body.small}>Cargando recordatorios...</p>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${spacing.gap.small} py-8 text-center`}>
        <Bell className="h-8 w-8 text-muted-foreground" />
        <p className={typography.body.small}>Aún no hay recordatorios para este vehículo</p>
        <p className={`${typography.body.small} text-muted-foreground`}>
          Crea un recordatorio para recibir notificaciones
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${spacing.gap.base} py-2`}>
      {reminders.map((reminder) => (
        <ReminderItem
          key={reminder.id || reminder.documentId}
          reminder={reminder}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
