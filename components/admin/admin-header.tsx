"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { Filter, Bell, User as UserIcon, X, Calendar, CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components_shadcn/ui/button";
import { Separator } from "@/components_shadcn/ui/separator";
import { typography } from "@/lib/design-system";
import { LogoutButton } from "@/components/ui/logout-button";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";
import { SpotlightSearch } from "./spotlight-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components_shadcn/ui/dropdown-menu";
import { Badge } from "@/components_shadcn/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { REMINDER_EVENTS, emitReminderDeleted, emitReminderToggleCompleted } from "@/lib/reminder-events";

interface AdminHeaderProps {
  title: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  showFilterAction?: boolean;
  onFilterActionClick?: () => void;
}

export function AdminHeader({
  title,
  leftActions,
  rightActions,
  showFilterAction = false,
  onFilterActionClick,
}: AdminHeaderProps) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const [showCompletedReminders, setShowCompletedReminders] = useState(false);

  // Cargar recordatorios
  useEffect(() => {
    const loadReminders = async () => {
      setIsLoadingReminders(true);
      try {
        const response = await fetch("/api/reminders", { cache: "no-store" });
        if (response.ok) {
          const { data } = await response.json();
          // Filtrar solo recordatorios activos, próximos y no completados
          const activeReminders = (data || []).filter((r: any) => 
            r.isActive && 
            new Date(r.nextTrigger) >= new Date() && 
            !r.isCompleted
          );
          // Ordenar por fecha próxima
          activeReminders.sort((a: any, b: any) => 
            new Date(a.nextTrigger).getTime() - new Date(b.nextTrigger).getTime()
          );
          setReminders(activeReminders.slice(0, 5)); // Mostrar solo los 5 más próximos
        }
      } catch (error) {
        console.error("Error cargando recordatorios:", error);
      } finally {
        setIsLoadingReminders(false);
      }
    };

    loadReminders();
    
    // Escuchar eventos de cambios en recordatorios
    const handleReminderChange = () => {
      loadReminders();
    };
    
    window.addEventListener(REMINDER_EVENTS.CREATED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.UPDATED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.DELETED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.TOGGLE_COMPLETED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.TOGGLE_ACTIVE, handleReminderChange);
    
    // Recargar cada minuto
    const interval = setInterval(loadReminders, 60000);
    
    // Recargar cuando la ventana vuelve a tener foco
    const handleFocus = () => {
      loadReminders();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener(REMINDER_EVENTS.CREATED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.UPDATED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.DELETED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.TOGGLE_COMPLETED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.TOGGLE_ACTIVE, handleReminderChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleDeleteReminder = async (reminderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderId)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Recordatorio eliminado");
        setReminders(prev => prev.filter(r => (r.documentId || String(r.id)) !== reminderId));
        // Emitir evento de eliminación
        emitReminderDeleted(reminderId);
      } else {
        throw new Error("Error al eliminar");
      }
    } catch (error) {
      console.error("Error eliminando recordatorio:", error);
      toast.error("No se pudo eliminar el recordatorio");
    }
  };

  const handleToggleCompleted = async (reminderId: string, isCompleted: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            isCompleted: !isCompleted,
          },
        }),
      });

      if (response.ok) {
        toast.success(isCompleted ? "Recordatorio marcado como pendiente" : "Recordatorio marcado como completado");
        // Actualizar el estado local
        setReminders(prev => prev.map(r => {
          if ((r.documentId || String(r.id)) === reminderId) {
            return { ...r, isCompleted: !isCompleted };
          }
          return r;
        }));
        // Emitir evento de cambio de estado completado
        emitReminderToggleCompleted(reminderId, !isCompleted);
      } else {
        throw new Error("Error al actualizar");
      }
    } catch (error) {
      console.error("Error actualizando recordatorio:", error);
      toast.error("No se pudo actualizar el recordatorio");
    }
  };

  const formatReminderTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: es });
      } else {
        return format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
      }
    } catch {
      return "Fecha inválida";
    }
  };

  const unreadCount = reminders.length;

  const defaultRightActions = (
    <>
      <SpotlightSearch />
      {showFilterAction && (
        <Button
          variant="ghost"
          size="icon"
          className="flex h-10 w-10 items-center justify-center rounded-full"
          onClick={onFilterActionClick}
          aria-label="Abrir filtros"
        >
          <Filter className="h-5 w-5" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="flex h-10 w-10 items-center justify-center rounded-full relative"
            aria-label="Ver notificaciones"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Recordatorios</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-[400px] overflow-y-auto">
            {isLoadingReminders ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Cargando recordatorios...
              </div>
            ) : reminders.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No hay recordatorios próximos
              </div>
            ) : (
              reminders.map((reminder) => {
                const reminderId = reminder.documentId || String(reminder.id);
                const vehicleName = reminder.vehicle?.name || "Vehículo";
                const nextTrigger = new Date(reminder.nextTrigger);
                const isAllDay = nextTrigger.getHours() === 0 && nextTrigger.getMinutes() === 0;
                
                const isCompleted = reminder.isCompleted || false;
                
                return (
                  <div key={reminderId}>
                    <DropdownMenuItem asChild className="p-0">
                      <div className="flex items-start gap-2 w-full p-3 hover:bg-accent">
                        <div className="flex-1 min-w-0">
                          <Link 
                            href={reminder.vehicle?.documentId ? `/fleet/details/${reminder.vehicle.documentId}` : "#"}
                            className="flex flex-col items-start gap-1 cursor-pointer"
                            onClick={(e) => {
                              if (!reminder.vehicle?.documentId) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                                ) : (
                                  <button
                                    onClick={(e) => handleToggleCompleted(reminderId, isCompleted, e)}
                                    className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30 hover:border-primary transition-colors flex items-center justify-center"
                                    aria-label="Marcar como completado"
                                    title="Marcar como completado"
                                  >
                                    <Circle className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                )}
                                <Calendar className={`h-4 w-4 shrink-0 ${isCompleted ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
                                <span className={`font-medium text-sm line-clamp-1 ${isCompleted ? "line-through text-muted-foreground/70" : ""}`}>{reminder.title}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isCompleted && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                                    onClick={(e) => handleToggleCompleted(reminderId, isCompleted, e)}
                                    aria-label="Marcar como pendiente"
                                    title="Marcar como pendiente"
                                  >
                                    <Circle className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => handleDeleteReminder(reminderId, e)}
                                  aria-label="Eliminar recordatorio"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {vehicleName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {isAllDay 
                                ? format(nextTrigger, "d 'de' MMMM, yyyy", { locale: es }) + " - todo el día"
                                : format(nextTrigger, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })
                              }
                            </span>
                            {reminder.description && (
                              <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {reminder.description}
                              </span>
                            )}
                          </Link>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </div>
                );
              })
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/notifications" className="w-full text-center justify-center text-primary hover:text-primary focus:text-primary font-medium">
              Ver todas las notificaciones
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="flex h-10 w-10 items-center justify-center rounded-full"
        aria-label="Ir al perfil"
        asChild
      >
        <Link href="/profile">
          <UserIcon className="h-5 w-5" />
          <span className="sr-only">Ir al perfil</span>
        </Link>
      </Button>
      <LogoutButton />
    </>
  );

  return (
    <header 
      className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-sm rounded-b-lg"
      style={{
        backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
        borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
      } as React.CSSProperties}
    >
      <MobileMenu />
      {leftActions && (
        <>
          {leftActions}
          <Separator orientation="vertical" className="mr-2 h-4" />
        </>
      )}
      {!leftActions && <Separator orientation="vertical" className="mr-2 h-4" />}
      <h1 className={`${typography.h3} hidden md:block`}>{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {rightActions ?? defaultRightActions}
      </div>
    </header>
  );
}
