/**
 * Utilidad para sincronizar recordatorios entre componentes
 * mediante eventos personalizados del navegador
 */

export const REMINDER_EVENTS = {
  CREATED: 'reminder:created',
  UPDATED: 'reminder:updated',
  DELETED: 'reminder:deleted',
  TOGGLE_COMPLETED: 'reminder:toggle-completed',
  TOGGLE_ACTIVE: 'reminder:toggle-active',
} as const;

/**
 * Emite un evento personalizado cuando se crea un recordatorio
 */
export function emitReminderCreated(reminder?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REMINDER_EVENTS.CREATED, { detail: reminder }));
  }
}

/**
 * Emite un evento personalizado cuando se actualiza un recordatorio
 */
export function emitReminderUpdated(reminder?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REMINDER_EVENTS.UPDATED, { detail: reminder }));
  }
}

/**
 * Emite un evento personalizado cuando se elimina un recordatorio
 */
export function emitReminderDeleted(reminderId: string | number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REMINDER_EVENTS.DELETED, { detail: { reminderId } }));
  }
}

/**
 * Emite un evento personalizado cuando se cambia el estado de completado de un recordatorio
 */
export function emitReminderToggleCompleted(reminderId: string | number, isCompleted: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REMINDER_EVENTS.TOGGLE_COMPLETED, { 
      detail: { reminderId, isCompleted } 
    }));
  }
}

/**
 * Emite un evento personalizado cuando se cambia el estado activo de un recordatorio
 */
export function emitReminderToggleActive(reminderId: string | number, isActive: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REMINDER_EVENTS.TOGGLE_ACTIVE, { 
      detail: { reminderId, isActive } 
    }));
  }
}
