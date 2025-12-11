"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
import { Combobox } from "@/components_shadcn/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components_shadcn/ui/dialog";
import { Archive, CheckCheck, Calendar, Plus, UserPlus, Sparkles, Receipt, Car, Bell, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { commonClasses, spacing, typography, colors } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { FleetReminder } from "@/validations/types";
import { toast } from "sonner";
import { FleetReminders } from "@/components/ui/fleet-reminders";
import { REMINDER_EVENTS, emitReminderToggleCompleted, emitReminderToggleActive, emitReminderDeleted } from "@/lib/reminder-events";

interface UserProfile {
  id: number;
  documentId: string;
  displayName: string;
  email?: string;
  role: "admin" | "seller" | "driver";
}

interface ManualNotification {
  id: number;
  documentId?: string;
  title: string;
  description?: string;
  type: "lead" | "sale" | "reminder" | "payment" | "inventory";
  isRead: boolean;
  timestamp: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  type: "reminder" | "lead" | "sale" | "payment" | "inventory";
  icon: typeof Calendar | typeof UserPlus | typeof Sparkles | typeof Receipt | typeof Car | typeof Bell;
  iconBgColor: string;
  iconColor: string;
  reminderId?: number;
  reminderDocumentId?: string;
  notificationId?: number;
  notificationDocumentId?: string;
  source: "reminder" | "manual";
}

// Función para obtener el icono según el tipo
function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "lead":
      return UserPlus;
    case "sale":
      return Sparkles;
    case "reminder":
      return Calendar;
    case "payment":
      return Receipt;
    case "inventory":
      return Car;
    default:
      return Bell;
  }
}

// Función para obtener los colores según el tipo
function getNotificationColors(type: Notification["type"]) {
  switch (type) {
    case "lead":
      return { bg: "bg-primary/10", color: "text-primary" };
    case "sale":
      return { bg: "bg-green-500/10", color: "text-green-600" };
    case "reminder":
      return { bg: "bg-primary/10", color: "text-primary" };
    case "payment":
      return { bg: "bg-red-500/10", color: "text-red-600" };
    case "inventory":
      return { bg: "bg-muted", color: "text-muted-foreground" };
    default:
      return { bg: "bg-muted", color: "text-muted-foreground" };
  }
}

// Función para formatear la fecha relativa
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(Math.abs(diffMs) / 60000);
  const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
  const diffDays = Math.floor(Math.abs(diffMs) / 86400000);
  const isPast = diffMs < 0;

  if (Math.abs(diffMins) < 1) {
    return "Ahora";
  } else if (diffMins < 60) {
    return isPast ? `Hace ${diffMins} min` : `En ${diffMins} min`;
  } else if (diffHours < 24) {
    return isPast 
      ? `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
      : `En ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  } else if (diffDays === 1) {
    return isPast ? "Ayer" : "Mañana";
  } else if (diffDays < 7) {
    return isPast ? `Hace ${diffDays} días` : `En ${diffDays} días`;
  } else {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: date.getHours() !== 0 || date.getMinutes() !== 0 ? "2-digit" : undefined,
      minute: date.getHours() !== 0 || date.getMinutes() !== 0 ? "2-digit" : undefined,
    });
  }
}

// Función para convertir recordatorios en notificaciones
function remindersToNotifications(reminders: FleetReminder[]): Notification[] {
  return reminders.map((reminder) => {
    const vehicleName = reminder.vehicle?.name || "Vehículo";
    const description = reminder.description 
      ? `${reminder.description} - ${vehicleName}`
      : vehicleName;
    
    return {
      id: `reminder-${reminder.documentId || reminder.id}`,
      title: reminder.title,
      description,
      timestamp: formatRelativeTime(reminder.nextTrigger),
      isRead: !reminder.isActive || new Date(reminder.nextTrigger) < new Date(),
      type: "reminder" as const,
      icon: Calendar,
      iconBgColor: reminder.isActive ? "bg-primary/10" : "bg-muted",
      iconColor: reminder.isActive ? "text-primary" : "text-muted-foreground",
      reminderId: reminder.id,
      reminderDocumentId: reminder.documentId,
      source: "reminder",
    };
  });
}

// Función para convertir notificaciones manuales en notificaciones
function manualNotificationsToNotifications(notifications: ManualNotification[]): Notification[] {
  return notifications.map((notification) => {
    const colors = getNotificationColors(notification.type);
    return {
      id: `notification-${notification.documentId || notification.id}`,
      title: notification.title,
      description: notification.description || "",
      timestamp: formatRelativeTime(notification.timestamp),
      isRead: notification.isRead,
      type: notification.type,
      icon: getNotificationIcon(notification.type),
      iconBgColor: colors.bg,
      iconColor: colors.color,
      notificationId: notification.id,
      notificationDocumentId: notification.documentId,
      source: "manual",
    };
  });
}

export default function NotificationsPage() {
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<FleetReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "seller" | "driver" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showCompletedReminders, setShowCompletedReminders] = useState(false);
  
  // Formulario
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"lead" | "sale" | "reminder" | "payment" | "inventory">("reminder");
  const [formRecipientType, setFormRecipientType] = useState<"specific" | "all_sellers" | "all_admins" | "all_drivers">("specific");
  const [formRecipientId, setFormRecipientId] = useState("");

  // Obtener el rol del usuario actual
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch("/api/user-profile/me", {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUserRole(data.data?.role || null);
        }
      } catch (err) {
        console.error("Error obteniendo rol del usuario:", err);
      }
    }
    fetchUserRole();
  }, []);

  // Obtener usuarios para el selector
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/user-profiles", {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.data || []);
        }
      } catch (err) {
        console.error("Error obteniendo usuarios:", err);
      }
    }
    fetchUsers();
  }, []);

  // Obtener recordatorios y notificaciones del usuario
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Obtener recordatorios
        const remindersResponse = await fetch("/api/reminders", {
          cache: "no-store",
        });

        // Obtener notificaciones manuales
        const notificationsResponse = await fetch("/api/notifications", {
          cache: "no-store",
        });

        const remindersData: FleetReminder[] = remindersResponse.ok 
          ? (await remindersResponse.json()).data || []
          : [];

        const manualNotifications: ManualNotification[] = notificationsResponse.ok
          ? (await notificationsResponse.json()).data || []
          : [];

        // Guardar recordatorios separados
        setReminders(remindersData);

        // Ordenar notificaciones manuales por fecha (más recientes primero)
        manualNotifications.sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        // Convertir solo notificaciones manuales a notificaciones
        const manualNotificationsList = manualNotificationsToNotifications(manualNotifications);
        
        // Solo usar notificaciones manuales
        setNotificationList(manualNotificationsList);
      } catch (err) {
        console.error("Error obteniendo notificaciones:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotifications();
    
    // Escuchar eventos de cambios en recordatorios
    const handleReminderChange = () => {
      fetchNotifications();
    };
    
    window.addEventListener(REMINDER_EVENTS.CREATED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.UPDATED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.DELETED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.TOGGLE_COMPLETED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.TOGGLE_ACTIVE, handleReminderChange);
    
    // Recargar cuando la ventana vuelve a tener foco
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener('focus', handleFocus);
    
    // Recargar cada minuto como respaldo
    const interval = setInterval(fetchNotifications, 60000);
    
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

  const handleMarkAllAsRead = () => {
    setNotificationList((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
  };

  const handleCreateNotification = async () => {
    if (!formTitle.trim()) {
      toast.error("El título es requerido");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          type: formType,
          recipientType: formRecipientType,
          recipientId: formRecipientType === "specific" ? formRecipientId : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear notificación");
      }

      const result = await response.json();
      toast.success(result.message || "Notificación creada exitosamente");
      
      // Limpiar formulario
      setFormTitle("");
      setFormDescription("");
      setFormType("reminder");
      setFormRecipientType("specific");
      setFormRecipientId("");
      setIsDialogOpen(false);

      // Recargar notificaciones
      window.location.reload();
    } catch (err) {
      console.error("Error creando notificación:", err);
      toast.error(err instanceof Error ? err.message : "Error al crear notificación");
    } finally {
      setIsCreating(false);
    }
  };

  const displayedNotifications = notificationList;

  const unreadCount = notificationList.filter((n) => !n.isRead).length;
  
  // Calcular recordatorios completados
  const completedReminders = reminders.filter((r) => r.isCompleted);
  const isAdmin = currentUserRole === "admin";

  return (
    <AdminLayout title="Centro de Notificaciones">
      {/* Header con botón de crear (solo para admins) */}
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Crear Notificación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Crear Nueva Notificación</DialogTitle>
              </DialogHeader>
              <div className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej: Reunión importante"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descripción de la notificación..."
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formType} onValueChange={(value: any) => setFormType(value)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="reminder">Recordatorio</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="sale">Venta</SelectItem>
                      <SelectItem value="payment">Pago</SelectItem>
                      <SelectItem value="inventory">Inventario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="recipientType">Destinatario</Label>
                  <Select value={formRecipientType} onValueChange={(value: any) => setFormRecipientType(value)}>
                    <SelectTrigger id="recipientType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="specific">Usuario específico</SelectItem>
                      <SelectItem value="all_sellers">Todos los vendedores</SelectItem>
                      <SelectItem value="all_admins">Todos los administradores</SelectItem>
                      <SelectItem value="all_drivers">Todos los conductores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formRecipientType === "specific" && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="recipientId">Usuario</Label>
                    <Combobox
                      options={users.map((user) => ({
                        value: user.documentId,
                        label: `${user.displayName} (${user.role === "admin" ? "Admin" : user.role === "seller" ? "Vendedor" : "Conductor"})`,
                        email: user.email,
                      }))}
                      value={formRecipientId}
                      onValueChange={setFormRecipientId}
                      placeholder="Selecciona un usuario"
                      searchPlaceholder="Buscar usuarios..."
                      emptyMessage="No se encontraron usuarios."
                      disabled={isCreating}
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="px-6 pb-6 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateNotification} disabled={isCreating}>
                  {isCreating ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Botón Ver completados en lugar de tabs */}
      {completedReminders.length > 0 && (
        <div className="px-0 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompletedReminders(!showCompletedReminders)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showCompletedReminders ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Ocultar completados ({completedReminders.length})
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Ver completados ({completedReminders.length})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Sección de Recordatorios */}
      {reminders.length > 0 && (
        <Card className={commonClasses.card}>
          <CardContent className={`flex flex-col ${spacing.gap.base} ${spacing.card.padding}`}>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-5 w-5" />
              <h3 className={typography.h4}>Recordatorios</h3>
            </div>
            <FleetReminders
              reminders={reminders}
              isLoading={false}
              onToggleCompleted={async (reminderId, isCompleted) => {
                try {
                  const response = await fetch(`/api/fleet-reminder/${encodeURIComponent(reminderId)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      data: { isCompleted: !isCompleted },
                    }),
                  });
                  if (!response.ok) throw new Error("Error al actualizar");
                  // Emitir evento de cambio de estado completado
                  emitReminderToggleCompleted(reminderId, !isCompleted);
                  toast.success(isCompleted ? "Recordatorio marcado como pendiente" : "Recordatorio marcado como completado");
                  // Recargar recordatorios
                  const remindersResponse = await fetch("/api/reminders", { cache: "no-store" });
                  if (remindersResponse.ok) {
                    const { data } = await remindersResponse.json();
                    setReminders(data || []);
                  }
                } catch (error) {
                  console.error("Error:", error);
                  toast.error("Error al actualizar el recordatorio");
                }
              }}
              vehicleId=""
              showCompletedButton={false}
              forceShowCompleted={showCompletedReminders}
            />
          </CardContent>
        </Card>
      )}

      {/* Lista de Notificaciones Manuales */}
      {notificationList.length > 0 && (
        <div className={`flex flex-col ${spacing.gap.medium} px-0`}>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-5 w-5" />
            <h3 className={typography.h4}>Notificaciones</h3>
          </div>
        </div>
      )}

      {/* Lista de Notificaciones */}
      <div className={`flex flex-col ${spacing.gap.medium} px-0 pb-28`}>
        {isLoading ? (
          <Card className={commonClasses.card}>
            <CardContent className={`flex flex-col items-center justify-center text-center ${spacing.card.padding}`}>
              <div className="flex items-center justify-center bg-muted rounded-full size-24 mb-6">
                <Calendar className="h-10 w-10 text-muted-foreground animate-pulse" />
              </div>
              <h3 className={typography.h3}>Cargando notificaciones...</h3>
              <p className={`${typography.body.small} mt-2 text-muted-foreground`}>
                Obteniendo tus notificaciones...
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className={commonClasses.card}>
            <CardContent className={`flex flex-col items-center justify-center text-center ${spacing.card.padding}`}>
              <div className="flex items-center justify-center bg-red-500/10 rounded-full size-24 mb-6">
                <Calendar className="h-10 w-10 text-red-600" />
              </div>
              <h3 className={typography.h3}>Error al cargar</h3>
              <p className={`${typography.body.small} mt-2 text-muted-foreground`}>
                {error}
              </p>
            </CardContent>
          </Card>
        ) : displayedNotifications.length === 0 && reminders.length === 0 ? (
          <Card className={commonClasses.card}>
            <CardContent className={`flex flex-col items-center justify-center text-center ${spacing.card.padding}`}>
              <div className="flex items-center justify-center bg-muted rounded-full size-24 mb-6">
                <Archive className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className={typography.h3}>¡Todo al día!</h3>
              <p className={`${typography.body.small} mt-2`}>
                No tienes notificaciones nuevas.
              </p>
            </CardContent>
          </Card>
        ) : displayedNotifications.length > 0 ? (
          displayedNotifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card
                key={notification.id}
                className={`${commonClasses.card} transition-all hover:bg-muted/50 cursor-pointer w-full`}
              >
                <CardContent className={`flex items-center ${spacing.gap.medium} ${spacing.card.padding}`}>
                  {/* Icono */}
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full ${notification.iconBgColor} ${notification.iconColor} size-12`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`${typography.body.large} font-semibold truncate`}>
                        {notification.title}
                      </p>
                      {notification.source === "reminder" && (
                        <Badge variant="outline" className="text-xs">
                          Recordatorio
                        </Badge>
                      )}
                    </div>
                    <p className={`${typography.body.base} text-muted-foreground truncate`}>
                      {notification.description}
                    </p>
                  </div>

                  {/* Timestamp y estado */}
                  <div className="flex flex-col items-end gap-2 text-right shrink-0">
                    <p className={`${typography.body.small} text-muted-foreground whitespace-nowrap`}>
                      {notification.timestamp}
                    </p>
                    {!notification.isRead && (
                      <Badge
                        className="size-2.5 rounded-full p-0 border-0 bg-primary"
                        style={{ backgroundColor: colors.primary }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : null}
      </div>

      {/* Floating Action Button */}
      {unreadCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleMarkAllAsRead}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            size="icon"
          >
            <CheckCheck className="h-6 w-6" />
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
