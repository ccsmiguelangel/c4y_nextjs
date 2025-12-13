import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { REMINDER_EVENTS, emitReminderCreated, emitReminderUpdated, emitReminderDeleted, emitReminderToggleCompleted, emitReminderToggleActive } from "@/lib/reminder-events";
import type { FleetReminder, ReminderType, RecurrencePattern } from "@/validations/types";

interface AvailableUser {
  id: number;
  documentId?: string;
  displayName?: string;
  email?: string;
  avatar?: { url?: string; alternativeText?: string };
}

interface UseVehicleRemindersReturn {
  vehicleReminders: FleetReminder[];
  isLoadingReminders: boolean;
  isSavingReminder: boolean;
  reminderTitle: string;
  reminderDescription: string;
  reminderType: ReminderType;
  reminderScheduledDate: string;
  reminderScheduledTime: string;
  isAllDay: boolean;
  reminderRecurrencePattern: RecurrencePattern;
  reminderRecurrenceEndDate: string;
  selectedResponsables: number[];
  selectedAssignedDrivers: number[];
  showReminderForm: boolean;
  editingReminderId: number | string | null;
  availableUsers: AvailableUser[];
  isLoadingUsers: boolean;
  setReminderTitle: (title: string) => void;
  setReminderDescription: (description: string) => void;
  setReminderType: (type: ReminderType) => void;
  setReminderScheduledDate: (date: string) => void;
  setReminderScheduledTime: (time: string) => void;
  setIsAllDay: (isAllDay: boolean) => void;
  setReminderRecurrencePattern: (pattern: RecurrencePattern) => void;
  setReminderRecurrenceEndDate: (date: string) => void;
  setSelectedResponsables: (ids: number[]) => void;
  setSelectedAssignedDrivers: (ids: number[]) => void;
  loadVehicleReminders: () => Promise<void>;
  loadAvailableUsers: () => Promise<void>;
  handleSaveReminder: (currentUserDocumentId: string | null, loadVehicle: () => Promise<void>) => Promise<void>;
  handleEditReminder: (reminder: FleetReminder) => void;
  handleDeleteReminder: (reminderId: number | string, loadVehicle: () => Promise<void>) => Promise<void>;
  handleToggleReminderActive: (reminderId: number | string, isActive: boolean, loadVehicle?: () => Promise<void>) => Promise<void>;
  handleToggleReminderCompleted: (reminderId: number | string, isCompleted: boolean, loadVehicle?: () => Promise<void>) => Promise<void>;
  handleOpenReminderForm: () => void;
  handleCancelReminderForm: () => void;
  setVehicleReminders: React.Dispatch<React.SetStateAction<FleetReminder[]>>;
}

export function useVehicleReminders(vehicleId: string): UseVehicleRemindersReturn {
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
  const [selectedResponsables, setSelectedResponsables] = useState<number[]>([]);
  const [selectedAssignedDrivers, setSelectedAssignedDrivers] = useState<number[]>([]);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<number | string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const handleOpenReminderForm = () => setShowReminderForm(true);
  
  const handleCancelReminderForm = () => {
    setShowReminderForm(false);
    setReminderTitle("");
    setReminderDescription("");
    setReminderScheduledDate("");
    setReminderScheduledTime("");
    setIsAllDay(false);
    setReminderType("unique");
    setReminderRecurrencePattern("daily");
    setReminderRecurrenceEndDate("");
    setSelectedResponsables([]);
    setSelectedAssignedDrivers([]);
    setEditingReminderId(null);
  };

  const loadAvailableUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`/api/user-profiles`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No pudimos obtener los usuarios");
      }
      const { data } = (await response.json()) as { data: AvailableUser[] };
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

  const loadVehicleReminders = useCallback(async () => {
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
  }, [vehicleId]);

  // Escuchar eventos de recordatorios para recargar automáticamente
  useEffect(() => {
    const handleReminderChange = () => {
      loadVehicleReminders();
    };

    window.addEventListener(REMINDER_EVENTS.CREATED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.UPDATED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.DELETED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.TOGGLE_COMPLETED, handleReminderChange);
    window.addEventListener(REMINDER_EVENTS.TOGGLE_ACTIVE, handleReminderChange);

    return () => {
      window.removeEventListener(REMINDER_EVENTS.CREATED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.UPDATED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.DELETED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.TOGGLE_COMPLETED, handleReminderChange);
      window.removeEventListener(REMINDER_EVENTS.TOGGLE_ACTIVE, handleReminderChange);
    };
  }, [loadVehicleReminders]);

  const handleSaveReminder = async (currentUserDocumentId: string | null, loadVehicle: () => Promise<void>) => {
    if (!reminderTitle?.trim() || !reminderScheduledDate) {
      toast.error("Error", {
        description: "El título y la fecha programada son requeridos",
      });
      return;
    }

    const allAssignedUserIds = [
      ...selectedResponsables,
      ...selectedAssignedDrivers,
    ].filter((id, index, self) => self.indexOf(id) === index); // Eliminar duplicados

    if (allAssignedUserIds.length === 0) {
      toast.error("Error", {
        description: "Debes asignar al menos un responsable o conductor al recordatorio",
      });
      return;
    }
    
    const timeToUse = isAllDay ? "00:00" : (reminderScheduledTime || "00:00");
    const scheduledDateTime = `${reminderScheduledDate}T${timeToUse}:00`;

    if (reminderType === "recurring" && !reminderRecurrencePattern) {
      toast.error("Error", {
        description: "El patrón de recurrencia es requerido para recordatorios recurrentes",
      });
      return;
    }

    setIsSavingReminder(true);
    try {
      const requestBody: { data: { title: string; description?: string; reminderType: ReminderType; scheduledDate: string; recurrencePattern?: RecurrencePattern; recurrenceEndDate?: string; assignedUserIds: number[]; authorDocumentId?: string; isAllDay?: boolean } } = {
        data: {
          title: reminderTitle?.trim() || "",
          reminderType: reminderType,
          scheduledDate: scheduledDateTime,
          isAllDay: isAllDay,
          assignedUserIds: allAssignedUserIds,
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
        
        // Emitir evento ANTES de actualizar para que otros componentes se enteren
        emitReminderUpdated(updatedReminder);
        
        const isMaintenanceReminder = updatedReminder.title.toLowerCase().includes("mantenimiento") || 
                                      updatedReminder.title === "Mantenimiento completo del vehículo";
        
        if (isMaintenanceReminder && vehicleId) {
          try {
            // Para recordatorios recurrentes, usar nextTrigger; para únicos, usar scheduledDate
            const maintenanceDate = updatedReminder.reminderType === "recurring" 
              ? updatedReminder.nextTrigger 
              : updatedReminder.scheduledDate;
            await fetch(`/api/fleet/${vehicleId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: {
                  nextMaintenanceDate: maintenanceDate,
                },
              }),
            });
            // Recargar el vehículo para actualizar nextMaintenanceDate en la UI
            await loadVehicle();
          } catch (error) {
            console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
          }
        }
        
        // Recargar recordatorios primero para que se actualice en la lista
        await loadVehicleReminders();
        
        // Pequeño delay para asegurar que el servidor procesó todo
        await new Promise(resolve => setTimeout(resolve, 300));
        
        handleCancelReminderForm();
        
        toast.success("Recordatorio actualizado", {
          description: "El recordatorio ha sido actualizado correctamente",
        });
      } else {
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
        
        // Emitir evento ANTES de actualizar para que otros componentes se enteren
        emitReminderCreated(createdReminder);
        
        const isMaintenanceReminder = createdReminder.title.toLowerCase().includes("mantenimiento") || 
                                      createdReminder.title === "Mantenimiento completo del vehículo";
        
        if (isMaintenanceReminder && vehicleId) {
          try {
            // Para recordatorios recurrentes, usar nextTrigger; para únicos, usar scheduledDate
            const maintenanceDate = createdReminder.reminderType === "recurring" 
              ? createdReminder.nextTrigger 
              : createdReminder.scheduledDate;
            await fetch(`/api/fleet/${vehicleId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: {
                  nextMaintenanceDate: maintenanceDate,
                },
              }),
            });
            // Recargar el vehículo para actualizar nextMaintenanceDate en la UI
            await loadVehicle();
          } catch (error) {
            console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
          }
        }
        
        // Recargar recordatorios primero para que aparezca en la lista
        await loadVehicleReminders();
        
        // Pequeño delay para asegurar que el servidor procesó todo
        await new Promise(resolve => setTimeout(resolve, 300));
        
        handleCancelReminderForm();
        
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

  const handleDeleteReminder = async (reminderId: number | string, loadVehicle: () => Promise<void>) => {
    try {
      const reminderIdStr = String(reminderId);
      
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

      // Actualizar estado local optimistamente
      setVehicleReminders((prev) => prev.filter((r) => {
        const matchesById = r.id && String(r.id) === reminderIdStr;
        const matchesByDocumentId = r.documentId && r.documentId === reminderIdStr;
        return !matchesById && !matchesByDocumentId;
      }));
      
      // Emitir evento con el ID correcto (preferir documentId si está disponible)
      const reminderIdToEmit = reminderToDelete?.documentId || reminderIdStr;
      emitReminderDeleted(reminderIdToEmit);
      
      // Recargar recordatorios desde el servidor para asegurar sincronización
      await loadVehicleReminders();
      
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
            await loadVehicle();
            toast.success("Recordatorio eliminado", {
              description: "El recordatorio de mantenimiento y la fecha han sido eliminados",
            });
          } else {
            toast.success("Recordatorio eliminado", {
              description: "El recordatorio ha sido eliminado",
            });
          }
        } catch {
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

  const handleToggleReminderActive = async (reminderId: number | string, isActive: boolean, loadVehicle?: () => Promise<void>) => {
    const reminderIdStr = String(reminderId);
    const newActiveState = !isActive;
    
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
      
      const isMaintenanceReminder = data.title.toLowerCase().includes("mantenimiento") || 
                                    data.title === "Mantenimiento completo del vehículo";
      
      // Si es un recordatorio de mantenimiento y está activo, actualizar nextMaintenanceDate
      if (isMaintenanceReminder && newActiveState && vehicleId) {
        try {
          const maintenanceDate = data.reminderType === "recurring" 
            ? data.nextTrigger 
            : data.scheduledDate;
          await fetch(`/api/fleet/${vehicleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: {
                nextMaintenanceDate: maintenanceDate,
              },
            }),
          });
          if (loadVehicle) {
            await loadVehicle();
          }
        } catch (error) {
          console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
        }
      }
      
      setVehicleReminders((prev) => {
        return prev.map((r) => {
          const matchesById = r.id && data.id && r.id === data.id;
          const matchesByDocumentId = r.documentId && data.documentId && r.documentId === data.documentId;
          const matchesByReminderId = String(r.id) === reminderIdStr || r.documentId === reminderIdStr;
          
          if (matchesById || matchesByDocumentId || matchesByReminderId) {
            return { ...data };
          }
          return r;
        });
      });
      
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

  const handleToggleReminderCompleted = async (reminderId: number | string, isCompleted: boolean, loadVehicle?: () => Promise<void>) => {
    const reminderIdStr = String(reminderId);
    const newCompletedState = !isCompleted;
    
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
      
      setVehicleReminders((prev) => {
        return prev.map((r) => {
          const matchesById = r.id && data.id && r.id === data.id;
          const matchesByDocumentId = r.documentId && data.documentId && r.documentId === data.documentId;
          const matchesByReminderId = String(r.id) === reminderIdStr || r.documentId === reminderIdStr;
          
          if (matchesById || matchesByDocumentId || matchesByReminderId) {
            return { ...data };
          }
          return r;
        });
      });
      
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
    if (!reminder) {
      console.error("❌ No se recibió el recordatorio");
      return;
    }
    
    const reminderId = reminder.documentId || String(reminder.id);
    
    const formatDateLocal = (dateString: string): string => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      
      return `${year}-${month}-${day}`;
    };
    
    const formatTimeLocal = (dateString: string): string => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      return `${hours}:${minutes}`;
    };
    
    const title = reminder.title || "";
    const description = reminder.description || "";
    const type = (reminder.reminderType || "unique") as ReminderType;
    const scheduledDateValue = formatDateLocal(reminder.scheduledDate);
    const scheduledTimeValue = formatTimeLocal(reminder.scheduledDate);
    const allDayValue = scheduledTimeValue === "00:00";
    const recurrencePattern = (reminder.recurrencePattern || "daily") as RecurrencePattern;
    const recurrenceEndDate = formatDateLocal(reminder.recurrenceEndDate || "");
    
    const userIds = reminder.assignedUsers?.map((u) => {
      if (u.id) return u.id;
      if (u.documentId && availableUsers.length > 0) {
        const foundUser = availableUsers.find(au => au.documentId === u.documentId);
        if (foundUser?.id) return foundUser.id;
      }
      return null;
    }).filter((id): id is number => id !== null) || [];
    
    // Separar en responsables y conductores basándose en el vehículo
    // Por ahora, asignamos todos a responsables (se puede mejorar después con lógica más específica)
    // TODO: Mejorar esta lógica para distinguir entre responsables y conductores del vehículo
    setEditingReminderId(reminderId);
    setReminderTitle(title);
    setReminderDescription(description);
    setReminderType(type);
    setReminderScheduledDate(scheduledDateValue);
    setReminderScheduledTime(scheduledTimeValue);
    setIsAllDay(allDayValue);
    setReminderRecurrencePattern(recurrencePattern);
    setReminderRecurrenceEndDate(recurrenceEndDate);
    // Por ahora, asignamos todos a responsables. Se puede mejorar con lógica del vehículo
    setSelectedResponsables(userIds);
    setSelectedAssignedDrivers([]);
    setShowReminderForm(true);
  };

  useEffect(() => {
    loadVehicleReminders();
    loadAvailableUsers();
  }, [loadVehicleReminders, loadAvailableUsers]);

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
        
        // Por ahora, asignamos todos a responsables. Se puede mejorar con lógica del vehículo
        setSelectedResponsables(userIds);
        setSelectedAssignedDrivers([]);
      }
    }
  }, [availableUsers, editingReminderId, vehicleReminders]);

  return {
    vehicleReminders,
    isLoadingReminders,
    isSavingReminder,
    reminderTitle,
    reminderDescription,
    reminderType,
    reminderScheduledDate,
    reminderScheduledTime,
    isAllDay,
    reminderRecurrencePattern,
    reminderRecurrenceEndDate,
    selectedResponsables,
    selectedAssignedDrivers,
    showReminderForm,
    editingReminderId,
    availableUsers,
    isLoadingUsers,
    setReminderTitle,
    setReminderDescription,
    setReminderType,
    setReminderScheduledDate,
    setReminderScheduledTime,
    setIsAllDay,
    setReminderRecurrencePattern,
    setReminderRecurrenceEndDate,
    setSelectedResponsables,
    setSelectedAssignedDrivers,
    loadVehicleReminders,
    loadAvailableUsers,
    handleSaveReminder,
    handleEditReminder,
    handleDeleteReminder,
    handleToggleReminderActive,
    handleToggleReminderCompleted,
    handleOpenReminderForm,
    handleCancelReminderForm,
    setVehicleReminders,
  };
}

