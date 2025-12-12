"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components_shadcn/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components_shadcn/ui/tabs";
import { Archive, CheckCheck, Calendar, Plus, UserPlus, Sparkles, Receipt, Car, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { commonClasses, spacing, typography, colors } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { FleetReminder } from "@/validations/types";
import { toast } from "sonner";
import { REMINDER_EVENTS } from "@/lib/reminder-events";

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
  fleetReminder?: {
    id: number;
    documentId?: string;
    title: string;
    description?: string;
    isActive: boolean;
    isCompleted: boolean;
    nextTrigger: string;
    vehicle?: {
      id: number;
      documentId?: string;
      name: string;
    };
  };
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
  const [activeTab, setActiveTab] = useState<"notifications" | "archived">("notifications");
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "seller" | "driver" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
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

  // Obtener notificaciones del usuario (ya sincronizadas desde la BD)
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Obtener todas las notificaciones (incluyendo las sincronizadas de recordatorios)
        const notificationsResponse = await fetch("/api/notifications", {
          cache: "no-store",
        });

        const allNotificationsFromDB: ManualNotification[] = notificationsResponse.ok
          ? (await notificationsResponse.json()).data || []
          : [];

        // Convertir todas las notificaciones de la BD al formato de la UI
        const convertedNotifications = allNotificationsFromDB.map((notification) => {
          // Si tiene fleetReminder, es una notificación sincronizada de recordatorio
          if (notification.fleetReminder) {
            const reminder = notification.fleetReminder;
            const vehicleName = reminder.vehicle?.name || "Vehículo";
            const description = reminder.description 
              ? `${reminder.description} - ${vehicleName}`
              : vehicleName;
            
            // Usar el timestamp de la notificación (que es el nextTrigger del recordatorio)
            const reminderTimestamp = notification.timestamp || reminder.nextTrigger;
            
            return {
              id: `reminder-${reminder.documentId || reminder.id}`,
              title: reminder.title,
              description,
              timestamp: formatRelativeTime(reminderTimestamp),
              isRead: notification.isRead,
              type: "reminder" as const,
              icon: Calendar,
              iconBgColor: reminder.isActive && !reminder.isCompleted ? "bg-primary/10" : "bg-muted",
              iconColor: reminder.isActive && !reminder.isCompleted ? "text-primary" : "text-muted-foreground",
              reminderId: reminder.id,
              reminderDocumentId: reminder.documentId,
              notificationId: notification.id,
              notificationDocumentId: notification.documentId,
              source: "reminder" as const,
              originalTimestamp: reminderTimestamp, // Guardar para ordenamiento
            };
          } else {
            // Es una notificación manual
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
              source: "manual" as const,
              originalTimestamp: notification.timestamp, // Guardar para ordenamiento
            };
          }
        });
        
        // Ordenar por fecha (no leídas primero, luego por timestamp)
        convertedNotifications.sort((a, b) => {
          // Las no leídas primero
          if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
          }
          // Luego por timestamp (más recientes primero)
          const dateA = (a as any).originalTimestamp || a.timestamp;
          const dateB = (b as any).originalTimestamp || b.timestamp;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        setNotificationList(convertedNotifications);
      } catch (err) {
        console.error("Error obteniendo notificaciones:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotifications();
    
    // Escuchar eventos de cambios en recordatorios para sincronización automática
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

  const handleMarkAllAsRead = async () => {
    try {
      // Obtener todas las notificaciones no leídas
      const unreadNotifications = notificationList.filter((n) => !n.isRead);
      
      // Marcar todas como leídas en la BD
      await Promise.all(
        unreadNotifications.map(async (notification) => {
          if (notification.notificationId || notification.notificationDocumentId) {
            const notificationId = notification.notificationId || notification.notificationDocumentId;
            try {
              await fetch(`/api/notifications/${notificationId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ isRead: true }),
              });
            } catch (error) {
              console.error(`Error marcando notificación ${notificationId} como leída:`, error);
            }
          }
        })
      );
      
      // Actualizar el estado local
      setNotificationList((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      
      toast.success("Todas las notificaciones han sido marcadas como leídas");
    } catch (error) {
      console.error("Error marcando todas las notificaciones como leídas:", error);
      toast.error("Error al marcar las notificaciones como leídas");
    }
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

  const displayedNotifications =
    activeTab === "archived"
      ? notificationList.filter((n) => n.isRead)
      : notificationList;

  const unreadCount = notificationList.filter((n) => !n.isRead).length;
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
              <DialogHeader>
                <DialogTitle>Crear Nueva Notificación</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
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
                    <SelectContent>
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
                    <SelectContent>
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
                    <Select value={formRecipientId} onValueChange={setFormRecipientId}>
                      <SelectTrigger id="recipientId">
                        <SelectValue placeholder="Selecciona un usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.documentId} value={user.documentId}>
                            {user.displayName} ({user.role === "admin" ? "Admin" : user.role === "seller" ? "Vendedor" : "Conductor"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
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

      {/* Tabs */}
      <div className="px-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "notifications" | "archived")}>
          <TabsList className="flex items-center justify-center w-full bg-transparent p-0 h-auto border-0 shadow-none gap-2">
            <TabsTrigger
              value="archived"
              className="flex items-center gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <Archive className="h-4 w-4" />
              <span className={typography.body.base}>Archivadas</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <span className={typography.body.base}>Notificaciones</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
        ) : displayedNotifications.length === 0 ? (
          <Card className={commonClasses.card}>
            <CardContent className={`flex flex-col items-center justify-center text-center ${spacing.card.padding}`}>
              <div className="flex items-center justify-center bg-muted rounded-full size-24 mb-6">
                <Archive className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className={typography.h3}>¡Todo al día!</h3>
              <p className={`${typography.body.small} mt-2`}>
                {activeTab === "archived"
                  ? "No tienes notificaciones archivadas."
                  : "No tienes notificaciones nuevas."}
              </p>
            </CardContent>
          </Card>
        ) : (
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
        )}
      </div>

      {/* Floating Action Button */}
      {activeTab === "notifications" && unreadCount > 0 && (
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
