"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components_shadcn/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/lib/toast";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { FleetDetailsDocumentsCard } from "@/app/fleet/components/fleet-details-documents";
import { FleetDetailsNotesCard } from "@/app/fleet/components/fleet-details-notes";
import { FleetDetailsRemindersCard } from "@/app/fleet/components/fleet-details-reminders";
import { FleetDetailsStatusCard } from "@/app/fleet/components/fleet-details-statuses";
import { isAllDay as isDateAllDay } from "@/components/ui/fleet/reminders/utils";
import type { FleetReminder, RecurrencePattern, ReminderType, FleetDocumentType } from "@/validations/types";
import { emitReminderCreated, emitReminderUpdated } from "@/lib/reminder-events";

// Hooks
import {
  useVehicleData,
  useVehicleNotes,
  useVehicleStatuses,
  useVehicleDocuments,
  useVehicleReminders,
  useVehicleForm,
  useCurrentUser,
} from "./hooks";

// Components
import {
  VehicleHeaderCard,
  VehicleInfoCard,
  VehicleEditForm,
  VehicleDeleteDialog,
  VehicleLoadingSkeleton,
} from "./components";

export default function FleetDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const vehicleId = params.id as string;

  // Estados locales de UI
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingMaintenanceReminder, setIsCreatingMaintenanceReminder] = useState(false);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  // Hooks personalizados
  const {
    vehicleData,
    isLoading,
    errorMessage,
    setErrorMessage,
    loadVehicle,
  } = useVehicleData(vehicleId);

  const { currentUserDocumentId, loadCurrentUserProfile } = useCurrentUser();

  const {
    notes,
    isLoadingNotes,
    note,
    showNoteForm,
    setNote,
    handleSaveNote: saveNote,
    handleEditNote,
    handleDeleteNote,
    handleOpenNoteForm,
    handleCancelNoteForm,
  } = useVehicleNotes(vehicleId);

  const {
    vehicleStatuses,
    isLoadingStatuses,
    loadingStatusId,
    statusComment,
    statusImages,
    statusImagePreviews,
    showStatusForm,
    setStatusComment,
    handleStatusImageChange,
    handleRemoveStatusImage,
    handleSaveStatus: saveStatus,
    handleEditStatus,
    handleDeleteStatus,
    handleOpenStatusForm,
    handleCancelStatusForm,
  } = useVehicleStatuses(vehicleId);

  const {
    vehicleDocuments,
    isLoadingDocuments,
    isSavingDocument,
    documentType,
    documentOtherDescription,
    documentFiles,
    showDocumentForm,
    setDocumentType,
    setDocumentOtherDescription,
    handleDocumentFileChange,
    handleRemoveDocumentFile,
    handleSaveDocument: saveDocument,
    handleDeleteDocument,
    handleOpenDocumentForm,
    handleCancelDocumentForm,
  } = useVehicleDocuments(vehicleId);

  const {
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
    selectedResponsables: reminderSelectedResponsables,
    selectedAssignedDrivers: reminderSelectedAssignedDrivers,
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
    setSelectedResponsables: setReminderSelectedResponsables,
    setSelectedAssignedDrivers: setReminderSelectedAssignedDrivers,
    loadVehicleReminders,
    handleSaveReminder: saveReminder,
    handleEditReminder,
    handleDeleteReminder: deleteReminder,
    handleToggleReminderActive,
    handleToggleReminderCompleted,
    handleOpenReminderForm,
    handleCancelReminderForm,
  } = useVehicleReminders(vehicleId);

  const {
    isEditing,
    isSaving,
    formData,
    imagePreview,
    selectedImageFile,
    shouldRemoveImage,
    maintenanceScheduledDate,
    maintenanceScheduledTime,
    maintenanceIsAllDay,
    maintenanceRecurrencePattern,
    maintenanceRecurrenceEndDate,
    selectedResponsables,
    selectedAssignedDrivers,
    selectedInterestedDrivers,
    selectedCurrentDrivers,
    setIsEditing,
    setFormData,
    setMaintenanceScheduledDate,
    setMaintenanceScheduledTime,
    setMaintenanceIsAllDay,
    setMaintenanceRecurrencePattern,
    setMaintenanceRecurrenceEndDate,
    setSelectedResponsables,
    setSelectedAssignedDrivers,
    setSelectedInterestedDrivers,
    setSelectedCurrentDrivers,
    syncFormWithVehicle,
    handleImageInputChange,
    handleRemoveImage,
    handleRestoreOriginalImage,
    handleCancelEdit: cancelEdit,
    handleSaveChanges,
  } = useVehicleForm(vehicleId);

  // Sincronizar formulario con datos del vehículo
  useEffect(() => {
    if (vehicleData) {
      syncFormWithVehicle(vehicleData);
    }
  }, [vehicleData, syncFormWithVehicle]);

  // Inicializar valores de mantenimiento desde el recordatorio cuando se abre el formulario de edición
  useEffect(() => {
    // Solo ejecutar cuando se abre el formulario de edición y hay recordatorios cargados
    if (!isEditing || isLoadingReminders) return;

    // Usar un pequeño delay para asegurar que syncFormWithVehicle termine primero
    const timeoutId = setTimeout(() => {
      const maintenanceReminder = vehicleReminders.find(
        (reminder) =>
          reminder.title.toLowerCase().includes("mantenimiento") ||
          reminder.title === "Mantenimiento completo del vehículo"
      );

      // Si hay un recordatorio de mantenimiento, cargar sus valores en el formulario
      if (maintenanceReminder) {
        const scheduledDate = new Date(maintenanceReminder.scheduledDate);
        const year = scheduledDate.getFullYear();
        const month = String(scheduledDate.getMonth() + 1).padStart(2, "0");
        const day = String(scheduledDate.getDate()).padStart(2, "0");
        setMaintenanceScheduledDate(`${year}-${month}-${day}`);

        const hours = String(scheduledDate.getHours()).padStart(2, "0");
        const minutes = String(scheduledDate.getMinutes()).padStart(2, "0");
        setMaintenanceScheduledTime(`${hours}:${minutes}`);

        const maintenanceReminderWithFlag = maintenanceReminder as FleetReminder & { isAllDay?: boolean };
        const isAllDayEvent = typeof maintenanceReminderWithFlag.isAllDay === "boolean"
          ? maintenanceReminderWithFlag.isAllDay
          : isDateAllDay(scheduledDate);
        setMaintenanceIsAllDay(isAllDayEvent);

        setMaintenanceRecurrencePattern(
          (maintenanceReminder.recurrencePattern as RecurrencePattern) || "monthly"
        );

        if (maintenanceReminder.recurrenceEndDate) {
          const endDate = new Date(maintenanceReminder.recurrenceEndDate);
          const endYear = endDate.getFullYear();
          const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
          const endDay = String(endDate.getDate()).padStart(2, "0");
          setMaintenanceRecurrenceEndDate(`${endYear}-${endMonth}-${endDay}`);
        } else {
          setMaintenanceRecurrenceEndDate("");
        }
      }
    }, 100); // Pequeño delay para asegurar que syncFormWithVehicle termine primero

    return () => clearTimeout(timeoutId);
  }, [isEditing, vehicleReminders, isLoadingReminders, setMaintenanceScheduledDate, setMaintenanceScheduledTime, setMaintenanceIsAllDay, setMaintenanceRecurrencePattern, setMaintenanceRecurrenceEndDate]);

  // Sincronizar nextMaintenanceDate con recordatorio cuando cambia el vehículo
  useEffect(() => {
    if (!vehicleData?.nextMaintenanceDate || isEditing || isLoadingReminders) return;
    
    const maintenanceReminder = vehicleReminders.find(
      (reminder) =>
        reminder.title.toLowerCase().includes("mantenimiento") ||
        reminder.title === "Mantenimiento completo del vehículo"
    );

    // Si hay nextMaintenanceDate pero el recordatorio tiene una fecha diferente, actualizar el recordatorio
    if (maintenanceReminder) {
      const vehicleMaintenanceDate = new Date(vehicleData.nextMaintenanceDate);
      const reminderDate = maintenanceReminder.reminderType === "recurring" 
        ? new Date(maintenanceReminder.nextTrigger)
        : new Date(maintenanceReminder.scheduledDate);
      
      // Si las fechas son diferentes (con una tolerancia de 1 minuto), actualizar el recordatorio
      const timeDiff = Math.abs(vehicleMaintenanceDate.getTime() - reminderDate.getTime());
      if (timeDiff > 60000) { // Más de 1 minuto de diferencia
        const year = vehicleMaintenanceDate.getFullYear();
        const month = String(vehicleMaintenanceDate.getMonth() + 1).padStart(2, "0");
        const day = String(vehicleMaintenanceDate.getDate()).padStart(2, "0");
        const hours = String(vehicleMaintenanceDate.getHours()).padStart(2, "0");
        const minutes = String(vehicleMaintenanceDate.getMinutes()).padStart(2, "0");
        
        const isAllDay = hours === "00" && minutes === "00";
        const scheduledDateTime = `${year}-${month}-${day}T${hours}:${minutes}:00`;
        
        const updateReminder = async () => {
          try {
            const reminderId = maintenanceReminder.documentId || String(maintenanceReminder.id);
            const updateData: any = {
              scheduledDate: scheduledDateTime,
              nextTrigger: scheduledDateTime,
              isAllDay: isAllDay,
            };
            
            await fetch(`/api/fleet-reminders/${encodeURIComponent(reminderId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: updateData }),
            });
            
            await loadVehicleReminders();
          } catch (error) {
            console.error("Error sincronizando recordatorio con fecha de mantenimiento:", error);
          }
        };
        
        updateReminder();
      }
    }
  }, [vehicleData?.nextMaintenanceDate, vehicleReminders, isEditing, isLoadingReminders, loadVehicleReminders]);

  // Verificar si se eliminó un recordatorio de mantenimiento y limpiar nextMaintenanceDate si es necesario
  useEffect(() => {
    if (isEditing || isLoadingReminders || isCreatingMaintenanceReminder) return;
    
    const maintenanceReminder = vehicleReminders.find(
      (reminder) =>
        reminder.title.toLowerCase().includes("mantenimiento") ||
        reminder.title === "Mantenimiento completo del vehículo"
    );

    // Si hay nextMaintenanceDate pero NO hay recordatorio de mantenimiento, limpiar la fecha
    // Agregar un pequeño delay para evitar condiciones de carrera cuando se está creando un recordatorio
    if (vehicleData?.nextMaintenanceDate && !maintenanceReminder) {
      const clearMaintenanceDate = async () => {
        // Esperar un poco para asegurar que los recordatorios se hayan cargado completamente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar nuevamente después del delay
        const currentReminders = vehicleReminders;
        const stillNoReminder = !currentReminders.find(
          (reminder) =>
            reminder.title.toLowerCase().includes("mantenimiento") ||
            reminder.title === "Mantenimiento completo del vehículo"
        );
        
        // Solo limpiar si realmente no hay recordatorio después del delay
        if (stillNoReminder && vehicleData?.nextMaintenanceDate) {
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
            await loadVehicle();
          } catch (error) {
            console.error("Error limpiando fecha de mantenimiento:", error);
          }
        }
      };
      
      clearMaintenanceDate();
    }
  }, [vehicleReminders, vehicleData?.nextMaintenanceDate, isEditing, isLoadingReminders, isCreatingMaintenanceReminder, vehicleId, loadVehicle]);

  // Sincronizar mantenimiento con recordatorios
  // DESHABILITADO: La creación automática de recordatorios causa duplicados
  // Los recordatorios se crean solo a través de syncMaintenanceReminder cuando se guarda el mantenimiento
  useEffect(() => {
    // NO sincronizar mientras se está editando o guardando
    if (isEditing || isSavingMaintenance) return;

    const maintenanceReminder = vehicleReminders.find(
      (reminder) =>
        reminder.title.toLowerCase().includes("mantenimiento") ||
        reminder.title === "Mantenimiento completo del vehículo"
    );

    // DESHABILITADO: No crear recordatorios automáticamente desde useEffect
    // Esto causa duplicados. Los recordatorios se crean solo cuando se guarda el mantenimiento
    // a través de syncMaintenanceReminder
    // if (!maintenanceReminder && vehicleData?.nextMaintenanceDate && ...) {
    //   ... código deshabilitado ...
    // }

    // Solo sincronizar valores cuando hay un recordatorio existente
    // NO limpiar valores cuando no hay recordatorio - permitir que el usuario los establezca manualmente
    if (maintenanceReminder) {
      const scheduledDate = new Date(maintenanceReminder.scheduledDate);
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, "0");
      const day = String(scheduledDate.getDate()).padStart(2, "0");
      setMaintenanceScheduledDate(`${year}-${month}-${day}`);

      const hours = String(scheduledDate.getHours()).padStart(2, "0");
      const minutes = String(scheduledDate.getMinutes()).padStart(2, "0");
      setMaintenanceScheduledTime(`${hours}:${minutes}`);

      const maintenanceReminderWithFlag = maintenanceReminder as FleetReminder & { isAllDay?: boolean };
      const isAllDayEvent = typeof maintenanceReminderWithFlag.isAllDay === "boolean"
        ? maintenanceReminderWithFlag.isAllDay
        : isDateAllDay(scheduledDate);
      setMaintenanceIsAllDay(isAllDayEvent);

      setMaintenanceRecurrencePattern(
        (maintenanceReminder.recurrencePattern as RecurrencePattern) || "monthly"
      );

      if (maintenanceReminder.recurrenceEndDate) {
        const endDate = new Date(maintenanceReminder.recurrenceEndDate);
        const endYear = endDate.getFullYear();
        const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
        const endDay = String(endDate.getDate()).padStart(2, "0");
        setMaintenanceRecurrenceEndDate(`${endYear}-${endMonth}-${endDay}`);
      } else {
        setMaintenanceRecurrenceEndDate("");
      }
    }
    // Si no hay recordatorio, NO limpiar los valores - permitir que el usuario los establezca
  }, [vehicleReminders, isEditing, vehicleData, isLoadingReminders, currentUserDocumentId, selectedResponsables, selectedAssignedDrivers, vehicleId, loadVehicleReminders, isCreatingMaintenanceReminder, isSavingMaintenance, setMaintenanceScheduledDate, setMaintenanceScheduledTime, setMaintenanceIsAllDay, setMaintenanceRecurrencePattern, setMaintenanceRecurrenceEndDate]);

  // Sincronizar usuarios disponibles con selecciones del formulario de edición
  // Solo actualizar cuando NO estamos editando y hay datos disponibles
  useEffect(() => {
    if (isEditing) return; // No actualizar mientras se está editando
    
    if (availableUsers.length > 0 && vehicleData) {
      if (vehicleData.responsables && vehicleData.responsables.length > 0) {
        const responsablesIds = vehicleData.responsables
          .map((resp) => {
            const foundUser = availableUsers.find(
              (u) => u.id === resp.id || u.documentId === resp.documentId
            );
            return foundUser?.id ?? resp.id;
          })
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        
        if (responsablesIds.length > 0) {
          setSelectedResponsables(responsablesIds);
        } else {
          setSelectedResponsables([]);
        }
      } else {
        setSelectedResponsables([]);
      }
      
      if (vehicleData.assignedDrivers && vehicleData.assignedDrivers.length > 0) {
        const assignedDriversIds = vehicleData.assignedDrivers
          .map((driver) => {
            const foundUser = availableUsers.find(
              (u) => u.id === driver.id || u.documentId === driver.documentId
            );
            return foundUser?.id ?? driver.id;
          })
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        
        if (assignedDriversIds.length > 0) {
          setSelectedAssignedDrivers(assignedDriversIds);
        } else {
          setSelectedAssignedDrivers([]);
        }
      } else {
        setSelectedAssignedDrivers([]);
      }
      
      if (vehicleData.interestedDrivers && vehicleData.interestedDrivers.length > 0) {
        const interestedDriversIds = vehicleData.interestedDrivers
          .map((driver) => {
            const foundUser = availableUsers.find(
              (u) => u.id === driver.id || u.documentId === driver.documentId
            );
            return foundUser?.id ?? driver.id;
          })
          .filter((id): id is number => typeof id === 'number' && !isNaN(id));
        
        if (interestedDriversIds.length > 0) {
          setSelectedInterestedDrivers(interestedDriversIds);
        } else {
          setSelectedInterestedDrivers([]);
        }
      } else {
        setSelectedInterestedDrivers([]);
      }
    }
  }, [availableUsers, vehicleData, isEditing, setSelectedResponsables, setSelectedAssignedDrivers, setSelectedInterestedDrivers]);

  // Inicializar responsables y conductores del recordatorio con los valores del vehículo cuando se abre el formulario
  useEffect(() => {
    if (showReminderForm && availableUsers.length > 0 && vehicleData && !editingReminderId) {
      // Solo inicializar si no estamos editando (editingReminderId es null)
      const responsablesIds = vehicleData.responsables
        ?.map((resp) => {
          const foundUser = availableUsers.find(
            (u) => u.id === resp.id || u.documentId === resp.documentId
          );
          return foundUser?.id ?? resp.id;
        })
        .filter((id): id is number => typeof id === 'number' && !isNaN(id)) || [];
      
      const assignedDriversIds = vehicleData.assignedDrivers
        ?.map((driver) => {
          const foundUser = availableUsers.find(
            (u) => u.id === driver.id || u.documentId === driver.documentId
          );
          return foundUser?.id ?? driver.id;
        })
        .filter((id): id is number => typeof id === 'number' && !isNaN(id)) || [];
      
      if (responsablesIds.length > 0 || assignedDriversIds.length > 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/31a9dc9e-273d-456b-92ee-729a3c566e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/app/fleet/details/[id]/page.tsx:487',message:'init reminder assignees',data:{responsablesCount:responsablesIds.length,assignedDriversCount:assignedDriversIds.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        setReminderSelectedResponsables(responsablesIds);
        setReminderSelectedAssignedDrivers(assignedDriversIds);
      }
    }
  }, [showReminderForm, availableUsers, vehicleData, editingReminderId, setReminderSelectedResponsables, setReminderSelectedAssignedDrivers]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31a9dc9e-273d-456b-92ee-729a3c566e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/app/fleet/details/[id]/page.tsx:495',message:'reminder assignees changed',data:{responsablesCount:reminderSelectedResponsables.length,assignedDriversCount:reminderSelectedAssignedDrivers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
  }, [reminderSelectedResponsables, reminderSelectedAssignedDrivers]);

  // Activar modo de edición si viene el query parameter
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam === "true" && !isLoading && vehicleData) {
      setIsEditing(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, isLoading, vehicleData, setIsEditing]);

  // Precio formateado
  const priceLabel = useMemo(() => {
    if (!vehicleData) return "";
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(vehicleData.priceNumber);
  }, [vehicleData]);

  // Función para sincronizar la fecha de mantenimiento con recordatorios
  const syncMaintenanceReminder = useCallback(async (
    maintenanceDate: string,
    maintenanceTime: string,
    maintenanceAllDay: boolean,
    recurrencePattern: RecurrencePattern,
    recurrenceEndDate?: string
  ) => {
    setIsSavingMaintenance(true);
    try {
      const maintenanceTitle = "Mantenimiento completo del vehículo";
      const existingReminder = vehicleReminders.find(
        (r) => r.title.toLowerCase().includes("mantenimiento") || r.title === maintenanceTitle
      );

      const timeToUse = maintenanceAllDay ? "00:00" : (maintenanceTime || "00:00");
      const scheduledDateTime = `${maintenanceDate}T${timeToUse}:00`;

      if (existingReminder) {
        const reminderId = existingReminder.documentId || String(existingReminder.id);
        const updateData: any = {
          title: maintenanceTitle,
          scheduledDate: scheduledDateTime,
          nextTrigger: scheduledDateTime,
          isAllDay: maintenanceAllDay,
          reminderType: "recurring",
          recurrencePattern: recurrencePattern,
        };
        
        if (recurrenceEndDate) {
          updateData.recurrenceEndDate = `${recurrenceEndDate}T00:00:00`;
        }
        
        const response = await fetch(`/api/fleet-reminders/${encodeURIComponent(reminderId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: updateData }),
        });

        if (response.ok) {
          const { data: updatedReminder } = await response.json() as { data: FleetReminder };
          
          // Emitir evento para sincronización con otros componentes
          emitReminderUpdated(updatedReminder);
          
          // Actualizar también nextMaintenanceDate del vehículo
          try {
            await fetch(`/api/fleet/${vehicleId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: {
                  nextMaintenanceDate: scheduledDateTime,
                },
              }),
            });
            await loadVehicle();
          } catch (error) {
            console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
          }
          // Esperar a que se recarguen los recordatorios antes de continuar
          await loadVehicleReminders();
          // Pequeño delay para asegurar que el estado se actualizó y evitar que el useEffect automático se ejecute
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        if (!currentUserDocumentId) {
          console.warn("⚠️ No se puede crear recordatorio: usuario no identificado");
          return;
        }

        // Marcar que se está creando para evitar que el useEffect también lo haga
        setIsCreatingMaintenanceReminder(true);

        const assignedUserIds = [
          ...selectedResponsables,
          ...selectedAssignedDrivers,
        ].filter((id, index, self) => self.indexOf(id) === index);

        const createData: any = {
          title: maintenanceTitle,
          description: `Mantenimiento completo programado para el vehículo ${vehicleData?.name || ""}`,
          reminderType: "recurring" as ReminderType,
          scheduledDate: scheduledDateTime,
          isAllDay: maintenanceAllDay,
          recurrencePattern: recurrencePattern,
          assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : undefined,
          authorDocumentId: currentUserDocumentId,
        };
        
        if (recurrenceEndDate) {
          createData.recurrenceEndDate = `${recurrenceEndDate}T00:00:00`;
        }

        const response = await fetch(`/api/fleet/${vehicleId}/reminders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: createData }),
        });

        if (response.ok) {
          const responseData = await response.json() as { data: FleetReminder };
          const createdReminder = responseData.data;
          
          // Emitir evento para sincronización con otros componentes
          emitReminderCreated(createdReminder);
          
          // Actualizar también nextMaintenanceDate del vehículo
          try {
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
            await loadVehicle();
          } catch (error) {
            console.error("Error actualizando fecha de mantenimiento del vehículo:", error);
          }
          // Esperar a que se recarguen los recordatorios antes de continuar
          await loadVehicleReminders();
          // Pequeño delay para asegurar que el estado se actualizó y evitar que el useEffect automático se ejecute
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Error sincronizando recordatorio de mantenimiento:", error);
    } finally {
      setIsSavingMaintenance(false);
      // Limpiar el flag de creación después de un delay adicional
      setTimeout(() => {
        setIsCreatingMaintenanceReminder(false);
      }, 1000);
    }
  }, [vehicleReminders, currentUserDocumentId, selectedResponsables, selectedAssignedDrivers, vehicleData, vehicleId, loadVehicle, loadVehicleReminders]);

  // Handlers
  const handleSaveNote = () => saveNote(currentUserDocumentId, loadCurrentUserProfile);
  const handleSaveStatus = () => saveStatus(currentUserDocumentId, loadCurrentUserProfile);
  const handleSaveDocument = () => saveDocument(currentUserDocumentId);
  const handleSaveReminder = () => saveReminder(currentUserDocumentId, loadVehicle);
  const handleDeleteReminder = useCallback((reminderId: number | string) => {
    return deleteReminder(reminderId, loadVehicle);
  }, [deleteReminder, loadVehicle]);
  const handleCancelEdit = () => cancelEdit(vehicleData);

  const handleSave = () => {
    handleSaveChanges(
      vehicleData,
      vehicleId,
      loadVehicle,
      syncMaintenanceReminder,
      vehicleReminders,
      loadVehicleReminders,
      setErrorMessage
    );
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

  // Botón de volver
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

  // Estados de carga y error
  if (isLoading) {
    return (
      <AdminLayout title="Cargando vehículo" showFilterAction leftActions={backButton}>
        <VehicleLoadingSkeleton />
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

  return (
    <AdminLayout title={vehicleData.name} showFilterAction leftActions={backButton}>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Header Card - Solo visible cuando no está editando */}
        {!isEditing && (
          <VehicleHeaderCard
            name={vehicleData.name}
            condition={vehicleData.condition}
            imageUrl={displayImageUrl}
            imageAlt={displayImageAlt}
            imageData={vehicleData.imageData}
            isDeleting={isDeleting}
            onEdit={() => setIsEditing(true)}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        )}

        {/* Información del vehículo - Modo edición o visualización */}
        {isEditing ? (
          <VehicleEditForm
            vehicleData={vehicleData}
            formData={formData}
            imagePreview={imagePreview}
            selectedImageFile={selectedImageFile}
            shouldRemoveImage={shouldRemoveImage}
            isSaving={isSaving}
            maintenanceScheduledDate={maintenanceScheduledDate}
            maintenanceScheduledTime={maintenanceScheduledTime}
            maintenanceIsAllDay={maintenanceIsAllDay}
            maintenanceRecurrencePattern={maintenanceRecurrencePattern}
            maintenanceRecurrenceEndDate={maintenanceRecurrenceEndDate}
            selectedResponsables={selectedResponsables}
            selectedAssignedDrivers={selectedAssignedDrivers}
            selectedInterestedDrivers={selectedInterestedDrivers}
            selectedCurrentDrivers={selectedCurrentDrivers}
            availableUsers={availableUsers}
            isLoadingUsers={isLoadingUsers}
            onFormDataChange={setFormData}
            onImageInputChange={handleImageInputChange}
            onRemoveImage={handleRemoveImage}
            onRestoreOriginalImage={() => handleRestoreOriginalImage(vehicleData.imageUrl ?? null)}
            onMaintenanceScheduledDateChange={setMaintenanceScheduledDate}
            onMaintenanceScheduledTimeChange={setMaintenanceScheduledTime}
            onMaintenanceIsAllDayChange={setMaintenanceIsAllDay}
            onMaintenanceRecurrencePatternChange={setMaintenanceRecurrencePattern}
            onMaintenanceRecurrenceEndDateChange={setMaintenanceRecurrenceEndDate}
            onSelectedResponsablesChange={setSelectedResponsables}
            onSelectedAssignedDriversChange={setSelectedAssignedDrivers}
            onSelectedInterestedDriversChange={setSelectedInterestedDrivers}
            onSelectedCurrentDriversChange={setSelectedCurrentDrivers}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
        ) : (
          <VehicleInfoCard
            vehicleData={vehicleData}
            priceLabel={priceLabel}
          />
        )}

        {/* Notas */}
        <FleetDetailsNotesCard
          notes={notes}
          isLoadingNotes={isLoadingNotes}
          showNoteForm={showNoteForm}
          noteValue={note}
          onAddNote={handleOpenNoteForm}
          onCancelNote={handleCancelNoteForm}
          onNoteChange={setNote}
          onSaveNote={handleSaveNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
          vehicleId={vehicleId}
        />

        {/* Estados */}
        <FleetDetailsStatusCard
          vehicleStatuses={vehicleStatuses}
          isLoadingStatuses={isLoadingStatuses}
          loadingStatusId={loadingStatusId}
          showStatusForm={showStatusForm}
          statusImagePreviews={statusImagePreviews}
          statusImagesCount={statusImages.length}
          statusComment={statusComment}
          onStatusCommentChange={setStatusComment}
          onAddStatus={handleOpenStatusForm}
          onCancelStatus={handleCancelStatusForm}
          onStatusImageChange={handleStatusImageChange}
          onRemoveStatusImage={handleRemoveStatusImage}
          onSaveStatus={handleSaveStatus}
          onEditStatus={handleEditStatus}
          onDeleteStatus={handleDeleteStatus}
          vehicleId={vehicleId}
        />

        {/* Documentos */}
        <FleetDetailsDocumentsCard
          vehicleDocuments={vehicleDocuments}
          isLoadingDocuments={isLoadingDocuments}
          showDocumentForm={showDocumentForm}
          documentFiles={documentFiles}
          documentType={documentType}
          documentOtherDescription={documentOtherDescription}
          documentFilesCount={documentFiles.length}
          isSavingDocument={isSavingDocument}
          onAddDocument={handleOpenDocumentForm}
          onCancelDocument={handleCancelDocumentForm}
          onDocumentFileChange={handleDocumentFileChange}
          onRemoveDocumentFile={handleRemoveDocumentFile}
          onDocumentTypeChange={(value: FleetDocumentType) => setDocumentType(value)}
          onDocumentOtherDescriptionChange={setDocumentOtherDescription}
          onSaveDocument={handleSaveDocument}
          onDeleteDocument={handleDeleteDocument}
          vehicleId={vehicleId}
        />

        {/* Recordatorios */}
        <FleetDetailsRemindersCard
          vehicleReminders={vehicleReminders}
          isLoadingReminders={isLoadingReminders}
          showReminderForm={showReminderForm}
          reminderTitle={reminderTitle}
          reminderDescription={reminderDescription}
          reminderType={reminderType}
          reminderScheduledDate={reminderScheduledDate}
          reminderScheduledTime={reminderScheduledTime}
          isAllDay={isAllDay}
          reminderRecurrencePattern={reminderRecurrencePattern}
          reminderRecurrenceEndDate={reminderRecurrenceEndDate}
          selectedResponsables={reminderSelectedResponsables}
          selectedAssignedDrivers={reminderSelectedAssignedDrivers}
          isSavingReminder={isSavingReminder}
          availableUsers={availableUsers}
          onAddReminder={handleOpenReminderForm}
          onCancelReminder={handleCancelReminderForm}
          onReminderTitleChange={setReminderTitle}
          onReminderDescriptionChange={setReminderDescription}
          onReminderTypeChange={(value: ReminderType) => setReminderType(value)}
          onReminderScheduledDateChange={setReminderScheduledDate}
          onReminderScheduledTimeChange={setReminderScheduledTime}
          onReminderIsAllDayChange={setIsAllDay}
          onReminderRecurrencePatternChange={(value: RecurrencePattern) => setReminderRecurrencePattern(value)}
          onReminderRecurrenceEndDateChange={setReminderRecurrenceEndDate}
          onSelectedResponsablesChange={setReminderSelectedResponsables}
          onSelectedAssignedDriversChange={setReminderSelectedAssignedDrivers}
          editingReminderId={editingReminderId}
          onSaveReminder={() => saveReminder(currentUserDocumentId, loadVehicle)}
          onEditReminder={handleEditReminder}
          onDeleteReminder={handleDeleteReminder}
          onToggleReminderActive={(id, isActive) => handleToggleReminderActive(id, isActive, loadVehicle)}
          onToggleReminderCompleted={(id, isCompleted) => handleToggleReminderCompleted(id, isCompleted, loadVehicle)}
          vehicleId={vehicleId}
        />
      </section>

      {/* Dialog de confirmación de eliminación */}
      <VehicleDeleteDialog
        isOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirmDelete={handleConfirmDelete}
      />
    </AdminLayout>
  );
}
