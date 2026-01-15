"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components_shadcn/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components_shadcn/ui/tabs";
import { Archive, CheckCheck, Calendar, Plus, UserPlus, Sparkles, Receipt, Car, Bell, Inbox, CheckCircle2, Circle, Pause, Play, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { commonClasses, spacing, typography, colors } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { FleetReminder, ReminderModule } from "@/validations/types";
import { toast } from "@/lib/toast";
import { REMINDER_EVENTS, emitReminderToggleCompleted, emitReminderToggleActive, emitReminderDeleted } from "@/lib/reminder-events";
import { MODULE_LABELS, MODULE_COLORS } from "@/components/ui/unified-reminders";

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
  module?: string;
  reminderType?: "unique" | "recurring";
  scheduledDate?: string;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  lastTriggered?: string;
  nextTrigger?: string;
  authorDocumentId?: string;
  assignedUsers?: Array<{
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  fleetVehicle?: {
    id: number;
    documentId?: string;
    name: string;
  };
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
  // Mantener fleetReminder para compatibilidad con código legacy
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
  // Campos adicionales para recordatorios
  isActive?: boolean;
  isCompleted?: boolean;
  module?: ReminderModule;
  vehicleName?: string;
  vehicleDocumentId?: string;
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"notifications" | "paused" | "completed">("notifications");
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [rawReminders, setRawReminders] = useState<FleetReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "seller" | "driver" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [togglingCompleted, setTogglingCompleted] = useState<Set<string>>(new Set());
  const [locallyUpdatedReminders, setLocallyUpdatedReminders] = useState<Set<string>>(new Set());
  const [deletingReminders, setDeletingReminders] = useState<Set<string>>(new Set());
  const [recentlyDeletedReminders, setRecentlyDeletedReminders] = useState<Set<string>>(new Set());
  // Refs para prevenir múltiples clics de forma síncrona
  const togglingCompletedRef = useRef<Set<string>>(new Set());
  const togglingActiveRef = useRef<Set<string>>(new Set());
  const deletingRemindersRef = useRef<Set<string>>(new Set());
  const [showDeleteReminderDialog, setShowDeleteReminderDialog] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  
  // Formulario
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"lead" | "sale" | "reminder" | "payment" | "inventory">("lead");
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

  // Función para obtener notificaciones del usuario (ya sincronizadas desde la BD)
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
        
        // Obtener todas las notificaciones (incluyendo las sincronizadas de recordatorios)
        const notificationsResponse = await fetch("/api/notifications", {
          cache: "no-store",
        });

        if (!notificationsResponse.ok) {
          throw new Error(`Error al obtener notificaciones: ${notificationsResponse.statusText}`);
        }

        const notificationsData = await notificationsResponse.json();
        const allNotificationsFromDB: ManualNotification[] = notificationsData.data || [];

        // También cargar recordatorios directamente para asegurar que todos aparezcan
        const remindersResponse = await fetch("/api/reminders", {
          cache: "no-store",
        });
        
        if (!remindersResponse.ok) {
          // Si falla obtener recordatorios, continuar solo con notificaciones
          console.warn("No se pudieron obtener recordatorios:", remindersResponse.statusText);
        }
        
        const remindersData = remindersResponse.ok
          ? await remindersResponse.json()
          : { data: [] };
        const allReminders: FleetReminder[] = remindersData.data || [];

        // Convertir todas las notificaciones de la BD al formato de la UI
        const convertedNotifications = allNotificationsFromDB
          .map((notification) => {
            // Si es un recordatorio directo (type='reminder')
            if (notification.type === "reminder") {
              const vehicleName = notification.fleetVehicle?.name || "Vehículo";
              const description = notification.description 
                ? `${notification.description} - ${vehicleName}`
                : vehicleName;
              
              // Usar nextTrigger si está disponible, sino usar timestamp
              const reminderTimestamp = notification.nextTrigger || notification.timestamp;
              
              return {
                id: `reminder-${notification.documentId || notification.id}`,
                title: notification.title,
                description,
                timestamp: formatRelativeTime(reminderTimestamp),
                isRead: notification.isRead || false,
                type: "reminder" as const,
                icon: Calendar,
                iconBgColor: notification.isActive && !notification.isCompleted ? "bg-primary/10" : "bg-muted",
                iconColor: notification.isActive && !notification.isCompleted ? "text-primary" : "text-muted-foreground",
                reminderId: notification.id,
                // Usar documentId si existe, sino usar el id numérico como string
                reminderDocumentId: notification.documentId || String(notification.id),
                notificationId: notification.id,
                notificationDocumentId: notification.documentId || String(notification.id),
                source: "reminder" as const,
                originalTimestamp: reminderTimestamp, // Guardar para ordenamiento
                // Campos adicionales para recordatorios
                isActive: notification.isActive,
                isCompleted: notification.isCompleted,
                module: (notification.module as ReminderModule) || "fleet",
                vehicleName: vehicleName,
                vehicleDocumentId: notification.fleetVehicle?.documentId,
              };
            }
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
          });
        
        // Guardar datos raw para procesamiento asíncrono
        setRawNotifications(convertedNotifications);
        setRawReminders(allReminders);
    } catch (err) {
      console.error("Error obteniendo notificaciones:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Deduplicación asíncrona usando useMemo
  const notificationList = useMemo(() => {
    if (rawNotifications.length === 0 && rawReminders.length === 0) {
      return [];
    }

    // Crear un mapa de recordatorios ya sincronizados en notificaciones
    const syncedReminderIds = new Set<string>();
    const syncedRemindersByKey = new Map<string, any>();
    const syncedRemindersByTitle = new Map<string, any[]>();
    
    rawNotifications
      .filter(n => n.source === "reminder")
      .forEach(n => {
        if (n.reminderDocumentId) {
          syncedReminderIds.add(n.reminderDocumentId);
        }
        if (n.reminderId) {
          syncedReminderIds.add(String(n.reminderId));
        }
        
        // También crear clave por título + vehículo
        const normalizedTitle = (n.title?.trim() || '').toLowerCase();
        const vehicleId = n.vehicleDocumentId || 'unknown';
        const key = `${normalizedTitle}-${vehicleId}`;
        syncedRemindersByKey.set(key, n);
        
        // Agrupar por título para detectar inconsistencias
        if (!syncedRemindersByTitle.has(normalizedTitle)) {
          syncedRemindersByTitle.set(normalizedTitle, []);
        }
        syncedRemindersByTitle.get(normalizedTitle)!.push(n);
      });

    // Convertir recordatorios no sincronizados a notificaciones
    const unsyncedRemindersAsNotifications = rawReminders
      .filter(reminder => {
        // Verificar por documentId o id
        const hasDocumentId = reminder.documentId && syncedReminderIds.has(reminder.documentId);
        const hasId = reminder.id && syncedReminderIds.has(String(reminder.id));
        
        // Verificar por título + vehículo
        const normalizedTitle = (reminder.title?.trim() || '').toLowerCase();
        let vehicleId = reminder.vehicle?.documentId || reminder.vehicle?.id;
        
        // Si este recordatorio no tiene vehículo, pero hay otro con el mismo título que sí lo tiene,
        // usar el vehículo del otro para la comparación
        if (!vehicleId) {
          const sameTitleNotifications = syncedRemindersByTitle.get(normalizedTitle) || [];
          const notificationWithVehicle = sameTitleNotifications.find((n: Notification) => 
            n.vehicleDocumentId
          );
          if (notificationWithVehicle) {
            vehicleId = notificationWithVehicle.vehicleDocumentId;
          }
        }
        
        vehicleId = vehicleId || 'unknown';
        const key = `${normalizedTitle}-${vehicleId}`;
        const hasSameKey = syncedRemindersByKey.has(key);
        
        // Si tiene el mismo documentId, id, o título+vehículo, ya está sincronizado
        if (hasDocumentId || hasId || hasSameKey) {
          return false;
        }
        
        return true;
      })
      .map((reminder) => {
        const vehicleName = reminder.vehicle?.name || "Vehículo";
        const description = reminder.description 
          ? `${reminder.description} - ${vehicleName}`
          : vehicleName;
        
        return {
          id: `reminder-${reminder.documentId || reminder.id}`,
          title: reminder.title,
          description,
          timestamp: formatRelativeTime(reminder.nextTrigger),
          isRead: false,
          type: "reminder" as const,
          icon: Calendar,
          iconBgColor: reminder.isActive && !reminder.isCompleted ? "bg-primary/10" : "bg-muted",
          iconColor: reminder.isActive && !reminder.isCompleted ? "text-primary" : "text-muted-foreground",
          reminderId: reminder.id,
          reminderDocumentId: reminder.documentId,
          source: "reminder" as const,
          originalTimestamp: reminder.nextTrigger,
          isActive: reminder.isActive,
          isCompleted: reminder.isCompleted,
          module: (reminder as any).module as ReminderModule || "fleet",
          vehicleName: vehicleName,
          vehicleDocumentId: reminder.vehicle?.documentId,
        };
      });
    
    // Combinar notificaciones sincronizadas con recordatorios no sincronizados
    const allNotifications = [...rawNotifications, ...unsyncedRemindersAsNotifications];
    
    // Eliminar duplicados usando la misma lógica que los endpoints
    const notificationsByDocumentId = new Map<string, Notification>();
    const notificationsByKey = new Map<string, Notification>();
    const notificationsByTitleOnly = new Map<string, Notification[]>();
    
    for (const notification of allNotifications) {
      // Primera verificación: duplicados exactos por documentId
      const documentId = notification.reminderDocumentId || notification.notificationDocumentId;
      if (documentId) {
        if (notificationsByDocumentId.has(documentId)) {
          continue;
        }
        notificationsByDocumentId.set(documentId, notification);
      }
      
      // Agregar a mapa por título para verificación adicional (solo para recordatorios)
      if (notification.source === "reminder") {
        const normalizedTitle = (notification.title?.trim() || '').toLowerCase();
        if (!notificationsByTitleOnly.has(normalizedTitle)) {
          notificationsByTitleOnly.set(normalizedTitle, []);
        }
        notificationsByTitleOnly.get(normalizedTitle)!.push(notification);
      }
      
      // Segunda verificación: para recordatorios, usar título + vehículo como clave
      if (notification.source === "reminder") {
        const normalizedTitle = (notification.title?.trim() || '').toLowerCase();
        
        // Buscar si hay otros recordatorios con el mismo título para detectar inconsistencias
        const sameTitleNotifications = notificationsByTitleOnly.get(normalizedTitle) || [];
        let vehicleId = notification.vehicleDocumentId;
        
        // Si este recordatorio no tiene vehículo, pero hay otro con el mismo título que sí lo tiene,
        // usar el vehículo del otro
        if (!vehicleId && sameTitleNotifications.length > 0) {
          const notificationWithVehicle = sameTitleNotifications.find((n: Notification) => 
            n.vehicleDocumentId
          );
          if (notificationWithVehicle) {
            vehicleId = notificationWithVehicle.vehicleDocumentId;
          }
        }
        
        // Si aún no hay vehículo, usar vehicleName normalizado o 'unknown'
        if (!vehicleId) {
          vehicleId = notification.vehicleName ? notification.vehicleName.toLowerCase().trim() : 'unknown';
        }
        const key = `${normalizedTitle}-${vehicleId}`;
        
        const existing = notificationsByKey.get(key);
        
        if (!existing) {
          notificationsByKey.set(key, notification);
        } else {
          // Ya existe, mantener el más reciente
          const existingTimestamp = (existing as any).originalTimestamp || existing.timestamp;
          const newTimestamp = (notification as any).originalTimestamp || notification.timestamp;
          const existingDate = existingTimestamp ? new Date(existingTimestamp).getTime() : 0;
          const newDate = newTimestamp ? new Date(newTimestamp).getTime() : 0;
          
          const existingId = (existing as any).reminderId || (existing as any).notificationId || 0;
          const newId = (notification as any).reminderId || (notification as any).notificationId || 0;
          
          // Priorizar el que tiene más información (vehículo)
          const existingHasVehicle = !!(existing.vehicleDocumentId || (existing as any).vehicleName !== 'Vehículo');
          const newHasVehicle = !!(notification.vehicleDocumentId || notification.vehicleName !== 'Vehículo');
          
          if (newHasVehicle && !existingHasVehicle) {
            notificationsByKey.set(key, notification);
          } else if (!newHasVehicle && existingHasVehicle) {
            // Mantener el existente
          } else if (newDate > existingDate || (newDate === existingDate && newId > existingId)) {
            notificationsByKey.set(key, notification);
          }
        }
      } else {
        // Para notificaciones manuales, usar id único
        notificationsByKey.set(`manual-${notification.id}`, notification);
      }
    }
    
    // Obtener notificaciones únicas
    const uniqueNotifications: Notification[] = [];
    const addedDocumentIds = new Set<string>();
    
    // Agregar todas las de notificationsByKey
    for (const notification of notificationsByKey.values()) {
      const docId = notification.reminderDocumentId || notification.notificationDocumentId;
      if (docId) {
        addedDocumentIds.add(docId);
      }
      uniqueNotifications.push(notification);
    }
    
    // Agregar las que solo están en notificationsByDocumentId
    for (const notification of notificationsByDocumentId.values()) {
      const docId = notification.reminderDocumentId || notification.notificationDocumentId;
      if (docId && !addedDocumentIds.has(docId)) {
        uniqueNotifications.push(notification);
      }
    }
    
    // Ordenar por fecha (no leídas primero, luego por timestamp)
    uniqueNotifications.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      const dateA = (a as any).originalTimestamp || a.timestamp;
      const dateB = (b as any).originalTimestamp || b.timestamp;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    
    return uniqueNotifications;
  }, [rawNotifications, rawReminders]);

  // Obtener notificaciones del usuario (ya sincronizadas desde la BD)
  useEffect(() => {
    fetchNotifications();
    
    // Escuchar eventos de cambios en recordatorios para sincronización automática
    const handleReminderChange = (event?: Event) => {
      const customEvent = event as CustomEvent<{ reminderId?: string | number }>;
      const eventType = customEvent?.type;
      
      // Para DELETE, verificar si lo eliminamos recientemente desde aquí
      if (eventType === REMINDER_EVENTS.DELETED) {
        if (customEvent?.detail?.reminderId) {
          const reminderId = String(customEvent.detail.reminderId);
          // Si lo eliminamos recientemente desde aquí, ya recargamos manualmente
          // Solo recargar si viene de otro lugar (página de detalles)
          if (recentlyDeletedReminders.has(reminderId)) {
            // Lo eliminamos desde aquí, ya recargamos, no hacer nada
            return;
          }
        }
        // Viene de otro lugar, esperar un poco para que el servidor procese y luego recargar
        setTimeout(() => {
          fetchNotifications();
        }, 300);
        return;
      }
      
      // Para otros eventos, verificar si lo actualizamos localmente
      if (customEvent?.detail?.reminderId) {
        const reminderId = String(customEvent.detail.reminderId);
        if (locallyUpdatedReminders.has(reminderId)) {
          // Ya lo actualizamos localmente, no recargar para evitar el parpadeo
          return;
        }
      }
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
  }, [fetchNotifications, recentlyDeletedReminders, locallyUpdatedReminders]);

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
      
      // Actualizar el estado local (actualizar rawNotifications)
      setRawNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      
      toast.success("Todas las notificaciones han sido marcadas como leídas");
    } catch (error) {
      console.error("Error marcando todas las notificaciones como leídas:", error);
      toast.error("Error al marcar las notificaciones como leídas");
    }
  };

  // Marcar recordatorio como completado
  const handleToggleCompleted = async (notification: Notification) => {
    if (notification.source !== "reminder") return;
    
    // Usar reminderDocumentId si existe, sino usar reminderId o notificationId
    const reminderId = notification.reminderDocumentId || 
                       (notification.reminderId ? String(notification.reminderId) : null) ||
                       (notification.notificationId ? String(notification.notificationId) : null);
    
    if (!reminderId) {
      console.error("No se pudo obtener el ID del recordatorio para actualizar:", notification);
      toast.error("Error: No se pudo identificar el recordatorio");
      return;
    }
    
    const notificationId = notification.id;
    
    // Prevenir múltiples clics de forma síncrona usando ref
    if (togglingCompletedRef.current.has(notificationId)) {
      return;
    }
    
    // Agregar inmediatamente al ref (síncrono)
    togglingCompletedRef.current.add(notificationId);
    
    // También actualizar el estado para el disabled del botón
    setTogglingCompleted((prev) => new Set(prev).add(notificationId));
    
    const newCompletedState = !notification.isCompleted;
    
    // Actualización optimista del estado ANTES de la petición
    const previousState = notification.isCompleted;
    
    // Actualizar rawNotifications si la notificación viene de ahí
    setRawNotifications((prev) =>
      prev.map((n) => {
        const matchesId = n.id === notification.id || 
                         (n.reminderDocumentId && n.reminderDocumentId === notification.reminderDocumentId) ||
                         (n.reminderId && String(n.reminderId) === String(notification.reminderId));
        if (matchesId && n.source === "reminder") {
          const isActive = n.isActive !== false;
          const isCompleted = newCompletedState;
          return {
            ...n,
            isCompleted: newCompletedState,
            iconBgColor: isActive && !isCompleted ? "bg-primary/10" : "bg-muted",
            iconColor: isActive && !isCompleted ? "text-primary" : "text-muted-foreground",
          };
        }
        return n;
      })
    );
    
    // Actualizar rawReminders si el recordatorio viene de ahí
    setRawReminders((prev) =>
      prev.map((r) => {
        const matchesId = (r.documentId && r.documentId === notification.reminderDocumentId) ||
                         (r.id && String(r.id) === String(notification.reminderId));
        if (matchesId) {
          return {
            ...r,
            isCompleted: newCompletedState,
          };
        }
        return r;
      })
    );
    
    try {
      // Log para depuración
      if (process.env.NODE_ENV === 'development') {
        console.log("Actualizando recordatorio:", {
          reminderId,
          notificationId: notification.id,
          reminderDocumentId: notification.reminderDocumentId,
          reminderIdNum: notification.reminderId,
          notificationIdNum: notification.notificationId,
          newCompletedState,
        });
      }
      
      const response = await fetch(`/api/notifications/${encodeURIComponent(reminderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { isCompleted: newCompletedState },
        }),
      });

      if (!response.ok) {
        let errorMessage = "Error al actualizar el recordatorio";
        try {
          // Clonar la respuesta para poder leer el body múltiples veces si es necesario
          const responseClone = response.clone();
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.error?.message || errorMessage;
        } catch (parseError) {
          // Si no se puede parsear como JSON, intentar leer como texto
          try {
            const errorText = await response.text();
            if (errorText) {
              try {
                const parsed = JSON.parse(errorText);
                errorMessage = parsed.error || parsed.error?.message || errorMessage;
              } catch {
                errorMessage = errorText || errorMessage;
              }
            }
          } catch (textError) {
            // Si tampoco se puede leer como texto, usar el mensaje por defecto
            console.error("Error leyendo respuesta del servidor:", textError);
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Marcar que actualizamos este recordatorio localmente
      setLocallyUpdatedReminders((prev) => new Set(prev).add(reminderId));
      
      // Emitir evento para sincronización con otros componentes
      emitReminderToggleCompleted(reminderId, newCompletedState);
      
      // Limpiar la marca después de un tiempo para permitir futuras actualizaciones desde otros componentes
      setTimeout(() => {
        setLocallyUpdatedReminders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(reminderId);
          return newSet;
        });
      }, 2000);
      
      toast.success(newCompletedState ? "Recordatorio completado" : "Recordatorio marcado como pendiente");
    } catch (error) {
      console.error("Error actualizando recordatorio:", error);
      // Revertir el estado optimista en caso de error
      setRawNotifications((prev) =>
        prev.map((n) => {
          const matchesId = n.id === notification.id || 
                           (n.reminderDocumentId && n.reminderDocumentId === notification.reminderDocumentId) ||
                           (n.reminderId && String(n.reminderId) === String(notification.reminderId));
          if (matchesId && n.source === "reminder") {
            const isActive = n.isActive !== false;
            const isCompleted = previousState;
            return {
              ...n,
              isCompleted: previousState,
              iconBgColor: isActive && !isCompleted ? "bg-primary/10" : "bg-muted",
              iconColor: isActive && !isCompleted ? "text-primary" : "text-muted-foreground",
            };
          }
          return n;
        })
      );
      
      setRawReminders((prev) =>
        prev.map((r) => {
          const matchesId = (r.documentId && r.documentId === notification.reminderDocumentId) ||
                           (r.id && String(r.id) === String(notification.reminderId));
          if (matchesId) {
            return {
              ...r,
              isCompleted: previousState,
            };
          }
          return r;
        })
      );
      
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar el recordatorio";
      toast.error(errorMessage);
    } finally {
      // Remover de la lista de procesando (tanto del ref como del estado)
      togglingCompletedRef.current.delete(notificationId);
      setTogglingCompleted((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // Pausar/Activar recordatorio
  const handleToggleActive = async (notification: Notification) => {
    if (notification.source !== "reminder") return;
    
    // Usar reminderDocumentId si existe, sino usar reminderId o notificationId
    const reminderId = notification.reminderDocumentId || 
                       (notification.reminderId ? String(notification.reminderId) : null) ||
                       (notification.notificationId ? String(notification.notificationId) : null);
    
    if (!reminderId) {
      console.error("No se pudo obtener el ID del recordatorio para actualizar:", notification);
      toast.error("Error: No se pudo identificar el recordatorio");
      return;
    }
    
    const notificationId = notification.id;
    
    // Prevenir múltiples clics de forma síncrona usando ref
    if (togglingActiveRef.current.has(notificationId)) {
      return;
    }
    
    // Agregar inmediatamente al ref (síncrono)
    togglingActiveRef.current.add(notificationId);
    
    const newActiveState = !notification.isActive;
    
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(reminderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { isActive: newActiveState },
        }),
      });

      if (!response.ok) {
        let errorMessage = "Error al actualizar el recordatorio";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.error?.message || errorMessage;
        } catch {
          const errorText = await response.text().catch(() => "");
          if (errorText) {
            try {
              const parsed = JSON.parse(errorText);
              errorMessage = parsed.error || parsed.error?.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        }
        throw new Error(errorMessage);
      }

      // Actualizar estado local
      setRawNotifications((prev) =>
        prev.map((n) => {
          const matchesId = n.id === notification.id || 
                           (n.reminderDocumentId && n.reminderDocumentId === notification.reminderDocumentId) ||
                           (n.reminderId && String(n.reminderId) === String(notification.reminderId));
          if (matchesId && n.source === "reminder") {
            return { ...n, isActive: newActiveState };
          }
          return n;
        })
      );
      
      setRawReminders((prev) =>
        prev.map((r) => {
          const matchesId = (r.documentId && r.documentId === notification.reminderDocumentId) ||
                           (r.id && String(r.id) === String(notification.reminderId));
          if (matchesId) {
            return { ...r, isActive: newActiveState };
          }
          return r;
        })
      );

      // Emitir evento para sincronización
      emitReminderToggleActive(reminderId, newActiveState);
      toast.success(newActiveState ? "Recordatorio activado" : "Recordatorio pausado");
    } catch (error) {
      console.error("Error actualizando recordatorio:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar el recordatorio";
      toast.error(errorMessage);
    } finally {
      // Remover de la lista de procesando
      togglingActiveRef.current.delete(notificationId);
    }
  };

  const handleRequestDeleteReminder = (notification: Notification) => {
    if (notification.source !== "reminder") return;
    
    // Usar reminderDocumentId si existe, sino usar reminderId o notificationId
    const reminderId = notification.reminderDocumentId || 
                       (notification.reminderId ? String(notification.reminderId) : null) ||
                       (notification.notificationId ? String(notification.notificationId) : null);
    
    if (!reminderId) {
      console.error("No se pudo obtener el ID del recordatorio para eliminar:", notification);
      toast.error("Error: No se pudo identificar el recordatorio");
      return;
    }
    
    if (deletingReminders.has(notification.id)) return;
    setNotificationToDelete(notification);
    setShowDeleteReminderDialog(true);
  };

  // Eliminar recordatorio (lógica real, llamada desde el modal de confirmación)
  const handleDeleteReminder = async (notification: Notification) => {
    if (notification.source !== "reminder") return;
    
    // Usar reminderDocumentId si existe, sino usar reminderId o notificationId
    const reminderId = notification.reminderDocumentId || 
                       (notification.reminderId ? String(notification.reminderId) : null) ||
                       (notification.notificationId ? String(notification.notificationId) : null);
    
    if (!reminderId) {
      console.error("No se pudo obtener el ID del recordatorio para eliminar:", notification);
      toast.error("Error: No se pudo identificar el recordatorio");
      return;
    }
    
    const notificationId = notification.id;
    
    // Prevenir múltiples clics de forma síncrona usando ref
    if (deletingRemindersRef.current.has(notificationId)) {
      return;
    }
    
    // Agregar inmediatamente al ref (síncrono)
    deletingRemindersRef.current.add(notificationId);
    
    // También actualizar el estado para el disabled del botón
    setDeletingReminders((prev) => new Set(prev).add(notificationId));
    
    // Actualización optimista: remover de la lista inmediatamente
    const previousRawNotifications = [...rawNotifications];
    const previousRawReminders = [...rawReminders];
    
    setRawNotifications((prev) => 
      prev.filter((n) => {
        const matchesId = n.id === notificationId || 
                         (n.reminderDocumentId && n.reminderDocumentId === reminderId) ||
                         (n.reminderId && String(n.reminderId) === String(notification.reminderId));
        return !matchesId;
      })
    );
    
    setRawReminders((prev) => 
      prev.filter((r) => {
        const matchesId = (r.documentId && r.documentId === reminderId) ||
                         (r.id && String(r.id) === reminderId);
        return !matchesId;
      })
    );
    
    try {
      // Obtener información del recordatorio antes de eliminarlo para verificar si es de mantenimiento
      const reminderResponse = await fetch(`/api/notifications/${encodeURIComponent(reminderId)}`, {
        cache: "no-store",
      });
      
      let isMaintenanceReminder = false;
      let vehicleId: string | null = null;
      
      if (reminderResponse.ok) {
        const reminderData = await reminderResponse.json();
        const reminder = reminderData.data;
        isMaintenanceReminder = 
          reminder.title?.toLowerCase().includes("mantenimiento") || 
          reminder.title === "Mantenimiento completo del vehículo";
        
        // Usar fleetVehicle en lugar de vehicle
        if (reminder.fleetVehicle?.documentId) {
          vehicleId = reminder.fleetVehicle.documentId;
        } else if (reminder.fleetVehicle?.id) {
          vehicleId = String(reminder.fleetVehicle.id);
        } else if (reminder.vehicle?.documentId) {
          vehicleId = reminder.vehicle.documentId;
        } else if (reminder.vehicle?.id) {
          vehicleId = String(reminder.vehicle.id);
        }
      }
      
      // Eliminar el recordatorio
      const response = await fetch(`/api/notifications/${encodeURIComponent(reminderId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar el recordatorio");
      }

      // Si es un recordatorio de mantenimiento, eliminar también nextMaintenanceDate del vehículo
      if (isMaintenanceReminder && vehicleId) {
        try {
          await fetch(`/api/fleet/${vehicleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: {
                nextMaintenanceDate: null,
              },
            }),
          });
        } catch (error) {
          console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
          // No fallar la eliminación si falla la actualización del vehículo
        }
      }

      // Marcar como eliminado recientemente para evitar recarga duplicada del evento
      setRecentlyDeletedReminders((prev) => new Set(prev).add(reminderId));
      
      // Emitir evento para sincronización con otros componentes (antes de recargar)
      // Esto permite que otros componentes se actualicen inmediatamente
      emitReminderDeleted(reminderId);
      
      // Delay más largo para asegurar que el servidor procesó la eliminación
      // y eliminó las notificaciones relacionadas
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recargar notificaciones para asegurar sincronización
      // Esto filtrará automáticamente las notificaciones huérfanas
      await fetchNotifications();
      
      // Limpiar la marca después de un tiempo
      setTimeout(() => {
        setRecentlyDeletedReminders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(reminderId);
          return newSet;
        });
      }, 2000);
      
      toast.success("Recordatorio eliminado", {
        description: isMaintenanceReminder 
          ? "El recordatorio de mantenimiento y la fecha han sido eliminados"
          : "El recordatorio ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error("Error eliminando recordatorio:", error);
      // Revertir el estado optimista en caso de error
      setRawNotifications(previousRawNotifications);
      setRawReminders(previousRawReminders);
      toast.error("Error al eliminar el recordatorio", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      // Remover de la lista de procesando (tanto del ref como del estado)
      deletingRemindersRef.current.delete(notificationId);
      setDeletingReminders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleCreateNotification = async () => {
    if (!formTitle.trim()) {
      toast.error("El título es requerido");
      return;
    }

    // Validar que si es tipo "specific", tenga un usuario seleccionado
    if (formRecipientType === "specific" && !formRecipientId) {
      toast.error("Por favor selecciona un usuario");
      return;
    }

    setIsCreating(true);
    
    const requestData = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      type: formType,
      recipientType: formRecipientType,
      recipientId: formRecipientType === "specific" ? formRecipientId : null,
    };

    console.log('📤 [notifications] Enviando petición para crear notificación:', requestData);

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 [notifications] Respuesta recibida:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        let errorMessage = "Error al crear notificación";
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
          console.error('❌ [notifications] Error del servidor:', error);
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ [notifications] Error al parsear respuesta:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ [notifications] Notificación creada exitosamente:', result);
      toast.success(result.message || "Notificación creada exitosamente");
      
      // Limpiar formulario
      setFormTitle("");
      setFormDescription("");
      setFormType("lead"); // Cambiar el valor por defecto a "lead" en lugar de "reminder"
      setFormRecipientType("specific");
      setFormRecipientId("");
      setIsDialogOpen(false);

      // Recargar notificaciones
      await fetchNotifications();
    } catch (err) {
      console.error("❌ [notifications] Error creando notificación:", err);
      toast.error(err instanceof Error ? err.message : "Error al crear notificación");
    } finally {
      setIsCreating(false);
    }
  };

  // Filtrar notificaciones según el tab
  const getDisplayedNotifications = () => {
    switch (activeTab) {
      case "completed":
        // Mostrar SOLO completados o leídos (excluir activos no completados)
        return notificationList.filter((n) => {
          // Si está completada, siempre aparece en completadas
          if (n.isCompleted) return true;
          // Si es una notificación manual y está leída, aparece en completadas
          if (n.source === "manual" && n.isRead) return true;
          // Si es un recordatorio y está leído pero no activo, aparece en completadas
          if (n.source === "reminder" && n.isRead && n.isActive === false) return true;
          return false;
        });
      case "paused":
        // Mostrar SOLO pausados que NO están completados
        return notificationList.filter((n) => 
          n.source === "reminder" && 
          n.isActive === false && 
          !n.isCompleted
        );
      case "notifications":
      default:
        // Mostrar SOLO activos que NO están completados
        return notificationList.filter((n) => {
          if (n.source === "reminder") {
            // Recordatorios: deben estar activos Y no completados (verificar explícitamente)
            return n.isActive !== false && n.isCompleted !== true && n.isCompleted !== 1;
          }
          // Notificaciones manuales: deben estar no leídas
          return !n.isRead;
        });
    }
  };

  const displayedNotifications = getDisplayedNotifications();

  const unreadCount = notificationList.filter((n) => {
    if (n.source === "reminder") {
      return n.isActive !== false && !n.isCompleted;
    }
    return !n.isRead;
  }).length;
  
  const pausedCount = notificationList.filter((n) => 
    n.source === "reminder" && 
    n.isActive === false && 
    !n.isCompleted
  ).length;
  
  const completedCount = notificationList.filter((n) => {
    // Si está completada, siempre cuenta
    if (n.isCompleted) return true;
    // Si es una notificación manual y está leída, cuenta
    if (n.source === "manual" && n.isRead) return true;
    // Si es un recordatorio y está leído pero no activo, cuenta
    if (n.source === "reminder" && n.isRead && n.isActive === false) return true;
    return false;
  }).length;
  
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
            <DialogContent className="max-w-md h-[90vh] p-0 !flex !flex-col overflow-hidden">
              <DialogHeader className={`${spacing.card.header} border-b shrink-0`}>
                <DialogTitle className={typography.h2}>Crear Nueva Notificación</DialogTitle>
              </DialogHeader>
              
              <ScrollAreaPrimitive.Root className="relative flex-1 min-h-0 overflow-hidden">
                <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
                  <div className={`flex flex-col ${spacing.gap.medium} ${spacing.card.content} pt-6`}>
                    <div className={`flex flex-col ${spacing.gap.small}`}>
                      <Label htmlFor="title" className={typography.label}>
                        Título <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ej: Reunión importante"
                        className="rounded-lg"
                      />
                    </div>
                    <div className={`flex flex-col ${spacing.gap.small}`}>
                      <Label htmlFor="description" className={typography.label}>
                        Descripción
                      </Label>
                      <Textarea
                        id="description"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Descripción de la notificación..."
                        rows={3}
                        className="rounded-lg resize-none"
                      />
                    </div>
                    <div className={`flex flex-col ${spacing.gap.small}`}>
                      <Label htmlFor="type" className={typography.label}>
                        Tipo
                      </Label>
                      <Select value={formType} onValueChange={(value: any) => setFormType(value)}>
                        <SelectTrigger id="type" className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="sale">Venta</SelectItem>
                          <SelectItem value="payment">Pago</SelectItem>
                          <SelectItem value="inventory">Inventario</SelectItem>
                          <SelectItem value="reminder">Aviso/Recordatorio</SelectItem>
                        </SelectContent>
                      </Select>
                      {formType === "reminder" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nota: Esta es una notificación manual. Los recordatorios completos con fecha programada se crean desde la sección de Flota.
                        </p>
                      )}
                    </div>
                    <div className={`flex flex-col ${spacing.gap.small}`}>
                      <Label htmlFor="recipientType" className={typography.label}>
                        Destinatario
                      </Label>
                      <Select value={formRecipientType} onValueChange={(value: any) => setFormRecipientType(value)}>
                        <SelectTrigger id="recipientType" className="rounded-lg">
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
                      <div className={`flex flex-col ${spacing.gap.small}`}>
                        <Label htmlFor="recipientId" className={typography.label}>
                          Usuario
                        </Label>
                        <Select value={formRecipientId} onValueChange={setFormRecipientId}>
                          <SelectTrigger id="recipientId" className="rounded-lg">
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
                </ScrollAreaPrimitive.Viewport>
                <ScrollAreaPrimitive.Scrollbar
                  className="flex touch-none select-none transition-colors h-2 bg-transparent p-[2px] group relative"
                  orientation="vertical"
                >
                  <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
                </ScrollAreaPrimitive.Scrollbar>
              </ScrollAreaPrimitive.Root>
              
              <DialogFooter className={`${spacing.card.header} border-t shrink-0`}>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">
                  Cancelar
                </Button>
                <Button onClick={handleCreateNotification} disabled={isCreating} className="rounded-lg">
                  {isCreating ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Tabs */}
      <div className="px-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "notifications" | "paused" | "completed")}>
          <TabsList className="flex items-center justify-start w-full bg-transparent p-0 h-auto border-0 shadow-none gap-2">
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <Inbox className="h-4 w-4" />
              <span className={typography.body.base}>Activas</span>
              {unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="paused"
              className="flex items-center gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <Pause className="h-4 w-4" />
              <span className={typography.body.base}>Pausadas</span>
              {pausedCount > 0 && (
                <span className="ml-1 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {pausedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex items-center gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className={typography.body.base}>Completadas</span>
              {completedCount > 0 && (
                <span className="ml-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                  {completedCount}
                </span>
              )}
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
                {activeTab === "completed"
                  ? "No tenemos nada completado aún."
                  : activeTab === "paused"
                  ? "No tienes ninguna tarea pausada de momento."
                  : "No tienes notificaciones nuevas."}
              </p>
            </CardContent>
          </Card>
        ) : (
          displayedNotifications.map((notification) => {
            const Icon = notification.icon;
            const isReminder = notification.source === "reminder";
            const moduleColors = notification.module ? MODULE_COLORS[notification.module] : null;
            
            const handleCardClick = () => {
              if (isReminder && notification.vehicleDocumentId) {
                router.push(`/fleet/details/${notification.vehicleDocumentId}`);
              }
            };

            const cardContent = (
              <Card
                key={notification.id}
                className={`${commonClasses.card} transition-all hover:bg-muted/50 w-full ${
                  notification.isCompleted ? "opacity-70" : ""
                } ${!notification.isActive && isReminder ? "border-dashed" : ""} ${
                  isReminder && notification.vehicleDocumentId ? "cursor-pointer" : ""
                }`}
                onClick={handleCardClick}
              >
                <CardContent className={`flex items-center ${spacing.gap.medium} ${spacing.card.padding}`}>
                  {/* Indicador de completado (solo para recordatorios) */}
                  {isReminder && (
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {notification.isCompleted ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleCompleted(notification);
                          }}
                          disabled={togglingCompleted.has(notification.id)}
                          className="h-5 w-5 shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Marcar como pendiente"
                          title="Marcar como pendiente"
                        >
                          <CheckCircle2 
                            className="h-5 w-5 text-green-600 cursor-pointer hover:text-green-700 transition-colors" 
                          />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleCompleted(notification);
                          }}
                          disabled={togglingCompleted.has(notification.id)}
                          className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/30 hover:border-primary transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Marcar como completado"
                          title="Marcar como completado"
                        >
                          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Icono */}
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full ${notification.iconBgColor} ${notification.iconColor} size-12`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`${typography.body.large} font-semibold truncate ${
                        notification.isCompleted ? "line-through text-muted-foreground" : ""
                      }`}>
                        {notification.title}
                      </p>
                      {isReminder && (
                        <Badge variant="outline" className="text-xs">
                          Recordatorio
                        </Badge>
                      )}
                      {/* Tag de módulo */}
                      {isReminder && notification.module && moduleColors && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${moduleColors.bg} ${moduleColors.text} ${moduleColors.border}`}
                        >
                          {MODULE_LABELS[notification.module]}
                        </Badge>
                      )}
                      {/* Badge de pausado */}
                      {isReminder && notification.isActive === false && !notification.isCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          Pausado
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
                    {/* Indicador de estado */}
                    <div className="flex items-center gap-1">
                      {notification.isCompleted ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : !notification.isRead ? (
                        <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                      ) : isReminder && notification.isActive === false ? (
                        <Pause className="h-3 w-3 text-muted-foreground" />
                      ) : null}
                    </div>
                  </div>

                  {/* Acciones para recordatorios */}
                  {isReminder && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Botón de ver en vehículo */}
                      {notification.vehicleDocumentId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver en vehículo"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            router.push(`/fleet/details/${notification.vehicleDocumentId}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {!notification.isCompleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(notification);
                          }}
                          title={notification.isActive ? "Pausar" : "Activar"}
                          disabled={deletingReminders.has(notification.id)}
                        >
                          {notification.isActive ? (
                            <Pause className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Play className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestDeleteReminder(notification);
                        }}
                        title="Eliminar recordatorio"
                        disabled={deletingReminders.has(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );

            return cardContent;
          })
        )}
      </div>

      {/* Diálogo de confirmación para eliminar recordatorios */}
      <AlertDialog
        open={showDeleteReminderDialog}
        onOpenChange={(open) => {
          setShowDeleteReminderDialog(open);
          if (!open) {
            setNotificationToDelete(null);
          }
        }}
      >
        <AlertDialogContent
          onClose={() => {
            setShowDeleteReminderDialog(false);
            setNotificationToDelete(null);
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este recordatorio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el recordatorio de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                notificationToDelete ? deletingReminders.has(notificationToDelete.id) : false
              }
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (notificationToDelete) {
                  void handleDeleteReminder(notificationToDelete);
                }
                setShowDeleteReminderDialog(false);
                setNotificationToDelete(null);
              }}
              disabled={
                notificationToDelete ? deletingReminders.has(notificationToDelete.id) : false
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {notificationToDelete && deletingReminders.has(notificationToDelete.id)
                ? "Eliminando..."
                : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

