import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";
import qs from "qs";

// Función helper para obtener el user-profile del usuario actual
async function getCurrentUserProfile() {
  try {
    const cookieStore = await cookies();
    const jwt = cookieStore.get("jwt")?.value;
    
    if (!jwt) {
      return null;
    }

    const userResponse = await fetch(`${STRAPI_BASE_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!userResponse.ok) {
      return null;
    }

    const userData = await userResponse.json();
    const userId = userData?.id;
    
    if (!userId) {
      return null;
    }

    const profileQuery = qs.stringify({
      filters: {
        email: { $eq: userData.email },
      },
      fields: ["documentId", "displayName", "email", "role"],
    });

    const profileResponse = await fetch(
      `${STRAPI_BASE_URL}/api/user-profiles?${profileQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!profileResponse.ok) {
      return null;
    }

    const profileData = await profileResponse.json();
    const profile = profileData.data?.[0];
    
    if (!profile || !profile.documentId) {
      return null;
    }

    return { 
      documentId: profile.documentId,
      displayName: profile.displayName || profile.email || "Usuario",
      email: profile.email,
      role: profile.role,
    };
  } catch (error) {
    console.error("Error obteniendo user-profile actual:", error);
    return null;
  }
}

// GET - Obtener notificaciones del usuario logueado
export async function GET() {
  try {
    const currentUser = await getCurrentUserProfile();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Obtener notificaciones del usuario (incluyendo las relacionadas con recordatorios)
    // IMPORTANTE: Obtener todas las notificaciones con recipient (incluyendo type='reminder' manuales)
    // Y también todos los recordatorios completos (type='reminder' con reminderType/module)
    // Luego filtrar en el código para separar manuales de completos y excluir notificaciones individuales
    const notificationQuery = qs.stringify({
      filters: {
        $or: [
          {
            // Notificaciones con recipient (incluye manuales normales Y manuales con type='reminder')
            recipient: {
              documentId: { $eq: currentUser.documentId },
            },
          },
          {
            // Obtener TODOS los recordatorios completos (type='reminder' con reminderType o module)
            // y filtrar después en el código para incluir: assignedUsers, author, responsables, assignedDrivers
            type: { $eq: "reminder" },
          },
        ],
      },
      fields: ["id", "documentId", "title", "description", "type", "isRead", "timestamp", "createdAt", "module", "tags", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId"],
      populate: {
        recipient: {
          fields: ["id", "documentId", "displayName", "email"],
        },
        assignedUsers: {
          fields: ["id", "documentId", "displayName", "email"],
          populate: {
            avatar: {
              fields: ["url", "alternativeText"],
            },
          },
        },
        fleetVehicle: {
          fields: ["id", "documentId", "name"],
          populate: {
            responsables: {
              fields: ["id", "documentId", "displayName", "email"],
            },
            assignedDrivers: {
              fields: ["id", "documentId", "displayName", "email"],
            },
          },
        },
        author: {
          fields: ["id", "documentId", "displayName", "email"],
          populate: {
            avatar: {
              fields: ["url", "alternativeText"],
            },
          },
        },
        // Mantener fleetReminder para compatibilidad con código legacy
        fleetReminder: {
          fields: ["id", "documentId", "title", "description", "isActive", "isCompleted", "nextTrigger"],
          populate: {
            vehicle: {
              fields: ["id", "documentId", "name"],
            },
          },
        },
      },
      sort: ["timestamp:desc"],
      pagination: {
        pageSize: 100,
      },
    });

    const response = await fetch(
      `${STRAPI_BASE_URL}/api/notifications?${notificationQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ data: [] });
      }
      const errorText = await response.text();
      throw new Error(`Error obteniendo notificaciones: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    
    // Separar notificaciones manuales de recordatorios
    // IMPORTANTE: Las notificaciones manuales con type='reminder' (sin reminderType ni module)
    // deben tratarse como notificaciones manuales, no como recordatorios
    const manualNotifications = (data.data || []).filter((notification: any) => {
      // Si no es tipo reminder, es manual
      if (notification.type !== "reminder") {
        return true;
      }
      // Si es tipo reminder pero NO tiene reminderType ni module, es una notificación manual
      // (simplemente usa 'reminder' como categoría, no es un recordatorio completo)
      const hasReminderType = notification.reminderType && typeof notification.reminderType === 'string' && notification.reminderType.trim() !== '';
      const hasModule = notification.module && typeof notification.module === 'string' && notification.module.trim() !== '';
      return !hasReminderType && !hasModule;
    });
    
    // Los recordatorios completos son los que tienen type='reminder' Y (reminderType o module)
    const allReminders = (data.data || []).filter((notification: any) => {
      if (notification.type !== "reminder") {
        return false;
      }
      const hasReminderType = notification.reminderType && typeof notification.reminderType === 'string' && notification.reminderType.trim() !== '';
      const hasModule = notification.module && typeof notification.module === 'string' && notification.module.trim() !== '';
      return hasReminderType || hasModule;
    });
    
    // Filtrar recordatorios: excluir notificaciones individuales y filtrar por usuario
    // Filtrar notificaciones individuales que tienen parentReminderId en tags
    // Estas son las notificaciones creadas por syncReminderNotifications para usuarios asignados
    // Solo queremos mostrar el recordatorio principal, no las notificaciones individuales
    const filteredReminders = allReminders.filter((reminder: any) => {
      // VALIDACIÓN CRÍTICA: Excluir notificaciones individuales de recordatorios
      // Las notificaciones individuales tienen parentReminderId en tags Y recipient
      // Los recordatorios principales NO tienen parentReminderId en tags NI recipient
      
      // Si tiene recipient (incluso si es un objeto populado), es una notificación individual
      if (reminder.recipient !== undefined && reminder.recipient !== null) {
        // Log en desarrollo para depuración
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [notifications] Excluyendo notificación individual (tiene recipient):', {
            id: reminder.id,
            documentId: reminder.documentId,
            title: reminder.title,
            recipient: reminder.recipient,
          });
        }
        return false;
      }
      
      try {
        const tags = typeof reminder.tags === 'string' 
          ? JSON.parse(reminder.tags) 
          : reminder.tags;
        
        // Si tiene parentReminderId (como número, string o cualquier valor truthy), es una notificación individual
        if (tags && (tags.parentReminderId !== undefined && tags.parentReminderId !== null)) {
          // Log en desarrollo para depuración
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [notifications] Excluyendo notificación individual (tiene parentReminderId):', {
              id: reminder.id,
              documentId: reminder.documentId,
              title: reminder.title,
              parentReminderId: tags.parentReminderId,
            });
          }
          return false;
        }
      } catch (error) {
        // Si hay error parseando tags, incluir la notificación por seguridad
        console.warn('Error parseando tags de recordatorio:', error);
      }
      
      // Incluir todas las demás notificaciones
      return true;
    });
    
    // Filtrar recordatorios que pertenecen al usuario actual:
    // 1. Tengan al usuario actual en assignedUsers, O
    // 2. El usuario actual sea el autor (authorDocumentId), O
    // 3. El usuario actual sea responsable del vehículo, O
    // 4. El usuario actual sea conductor asignado del vehículo
    // IMPORTANTE: Incluir TODOS los recordatorios (completados y no completados) para que aparezcan en la pestaña "completed"
    const userReminders = filteredReminders.filter((reminder: any) => {
      // Verificar si el usuario actual es el autor del recordatorio
      const isAuthor = reminder.authorDocumentId === currentUser.documentId;
      
      // Verificar si el usuario actual está en la lista de usuarios asignados
      const isAssigned = reminder.assignedUsers?.some(
        (user: any) => user?.documentId === currentUser.documentId
      );
      
      // Verificar si el usuario actual es responsable del vehículo
      const isResponsable = reminder.fleetVehicle?.responsables?.some(
        (resp: any) => resp?.documentId === currentUser.documentId
      );
      
      // Verificar si el usuario actual es conductor asignado del vehículo
      const isAssignedDriver = reminder.fleetVehicle?.assignedDrivers?.some(
        (driver: any) => driver?.documentId === currentUser.documentId
      );
      
      const shouldInclude = isAuthor || isAssigned || isResponsable || isAssignedDriver;
      
      return shouldInclude;
    });
    
    // Filtrar notificaciones manuales: incluir solo las que pertenecen al usuario actual
    // Excluir notificaciones individuales de recordatorios (tienen parentReminderId en tags)
    const filteredManualNotifications = manualNotifications.filter((notification: any) => {
      // Si tiene recipient, verificar que sea el usuario actual
      if (notification.recipient) {
        const recipientDocId = typeof notification.recipient === 'object' 
          ? notification.recipient.documentId 
          : null;
        if (recipientDocId !== currentUser.documentId) {
          return false;
        }
      }
      
      // Excluir notificaciones individuales de recordatorios (tienen parentReminderId en tags)
      try {
        const tags = typeof notification.tags === 'string' 
          ? JSON.parse(notification.tags) 
          : notification.tags;
        if (tags && tags.parentReminderId !== undefined && tags.parentReminderId !== null) {
          return false; // Es una notificación individual de recordatorio
        }
      } catch (error) {
        // Si hay error parseando tags, continuar
      }
      
      return true;
    });
    
    // Combinar notificaciones manuales filtradas con recordatorios filtrados
    const filteredNotifications = [...filteredManualNotifications, ...userReminders];
    
    // Eliminar duplicados: si hay múltiples recordatorios con el mismo título y vehículo,
    // mantener solo el más reciente (basado en createdAt o id)
    // También verificar por documentId para evitar duplicados exactos
    const notificationsByKey = new Map<string, any>();
    const notificationsByDocumentId = new Map<string, any>();
    const notificationsByTitleOnly = new Map<string, any[]>(); // Para detectar duplicados por título
    
    for (const notification of filteredNotifications) {
      // Primera verificación: si ya vimos este documentId, saltarlo (duplicado exacto)
      if (notification.documentId) {
        if (notificationsByDocumentId.has(notification.documentId)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [notifications] Duplicado por documentId, saltando:', {
              documentId: notification.documentId,
              title: notification.title,
              id: notification.id,
            });
          }
          continue;
        }
        notificationsByDocumentId.set(notification.documentId, notification);
      }
      
      // Agregar a mapa por título para verificación adicional (solo para recordatorios)
      if (notification.type === 'reminder') {
        const normalizedTitle = (notification.title?.trim() || '').toLowerCase();
        if (!notificationsByTitleOnly.has(normalizedTitle)) {
          notificationsByTitleOnly.set(normalizedTitle, []);
        }
        notificationsByTitleOnly.get(normalizedTitle)!.push(notification);
      }
      
      // Segunda verificación: para recordatorios, crear una clave única basada en título y vehículo
      if (notification.type === 'reminder') {
        // Normalizar el título (trim, lowercase) para evitar diferencias por espacios o mayúsculas
        const normalizedTitle = (notification.title?.trim() || '').toLowerCase();
        
        // Buscar si hay otros recordatorios con el mismo título para detectar inconsistencias
        const sameTitleNotifications = notificationsByTitleOnly.get(normalizedTitle) || [];
        let vehicleId = notification.fleetVehicle?.documentId || 
                       (notification.fleetVehicle?.id ? String(notification.fleetVehicle.id) : null);
        
        // Si este recordatorio no tiene vehículo, pero hay otro con el mismo título que sí lo tiene,
        // usar el vehículo del otro (probablemente es el mismo recordatorio con datos inconsistentes)
        if (!vehicleId && sameTitleNotifications.length > 0) {
          const notificationWithVehicle = sameTitleNotifications.find((n: any) => 
            n.fleetVehicle?.documentId || n.fleetVehicle?.id
          );
          if (notificationWithVehicle) {
            vehicleId = notificationWithVehicle.fleetVehicle?.documentId || 
                       (notificationWithVehicle.fleetVehicle?.id ? String(notificationWithVehicle.fleetVehicle.id) : null);
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 [notifications] Recordatorio sin vehículo, usando vehículo de otro con mismo título:', {
                title: notification.title,
                foundVehicleId: vehicleId,
              });
            }
          }
        }
        
        // Si aún no hay vehículo, usar 'unknown'
        vehicleId = vehicleId || 'unknown';
        const key = `${normalizedTitle}-${vehicleId}`;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [notifications] Procesando recordatorio para deduplicación:', {
            key,
            title: notification.title,
            normalizedTitle,
            vehicleId,
            vehicleDocumentId: notification.fleetVehicle?.documentId,
            vehicleIdNum: notification.fleetVehicle?.id,
            hasVehicle: !!notification.fleetVehicle,
            notificationDocumentId: notification.documentId,
            notificationId: notification.id,
          });
        }
        
        const existing = notificationsByKey.get(key);
        
        if (!existing) {
          // No existe, agregarlo
          notificationsByKey.set(key, notification);
        } else {
          // Ya existe, mantener el más reciente (mayor id o createdAt más reciente)
          const existingId = existing.id || 0;
          const newId = notification.id || 0;
          const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
          const newDate = notification.createdAt ? new Date(notification.createdAt).getTime() : 0;
          
          // Si el nuevo tiene mayor ID o fecha más reciente, reemplazar
          if (newId > existingId || newDate > existingDate) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 [notifications] Reemplazando recordatorio duplicado:', {
                key,
                existingId: existing.id,
                existingDocumentId: existing.documentId,
                existingVehicle: existing.fleetVehicle?.documentId || existing.fleetVehicle?.id || 'none',
                newId: notification.id,
                newDocumentId: notification.documentId,
                newVehicle: notification.fleetVehicle?.documentId || notification.fleetVehicle?.id || 'none',
                title: notification.title,
              });
            }
            notificationsByKey.set(key, notification);
            // También actualizar en notificationsByDocumentId si tiene documentId
            if (notification.documentId) {
              notificationsByDocumentId.set(notification.documentId, notification);
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 [notifications] Manteniendo recordatorio existente (más reciente):', {
                key,
                existingId: existing.id,
                existingDocumentId: existing.documentId,
                existingVehicle: existing.fleetVehicle?.documentId || existing.fleetVehicle?.id || 'none',
                newId: notification.id,
                newDocumentId: notification.documentId,
                newVehicle: notification.fleetVehicle?.documentId || notification.fleetVehicle?.id || 'none',
                title: notification.title,
              });
            }
          }
        }
      } else {
        // Para notificaciones no recordatorios, agregarlas directamente (no hay duplicados por título+vehículo)
        notificationsByKey.set(`manual-${notification.id}`, notification);
      }
    }
    
    const uniqueNotifications = Array.from(notificationsByKey.values());
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [notifications] Resumen de deduplicación:', {
        totalDespuésDeFiltro: filteredNotifications.length,
        únicosDespuésDeDeduplicación: uniqueNotifications.length,
        eliminados: filteredNotifications.length - uniqueNotifications.length,
      });
    }
    
    return NextResponse.json({ data: uniqueNotifications });
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Crear notificaciones (solo para administradores)
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserProfile();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar que el usuario sea administrador
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para crear notificaciones" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, type, recipientType, recipientId } = body;

    if (!title || !type || !recipientType) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: title, type, recipientType" },
        { status: 400 }
      );
    }

    // Obtener los IDs de los usuarios destinatarios según el tipo
    let recipientIds: number[] = [];

    if (recipientType === "specific" && recipientId) {
      // Usuario específico
      const userQuery = qs.stringify({
        filters: {
          documentId: { $eq: recipientId },
        },
        fields: ["id"],
      });

      const userResponse = await fetch(
        `${STRAPI_BASE_URL}/api/user-profiles?${userQuery}`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.data?.[0]?.id) {
          recipientIds = [userData.data[0].id];
        }
      }
    } else if (recipientType === "all_sellers" || recipientType === "all_admins" || recipientType === "all_drivers") {
      // Obtener todos los usuarios del rol especificado
      const role = recipientType === "all_sellers" ? "seller" 
                 : recipientType === "all_admins" ? "admin" 
                 : "driver";

      const roleQuery = qs.stringify({
        filters: {
          role: { $eq: role },
        },
        fields: ["id"],
        pagination: {
          pageSize: 1000,
        },
      });

      const roleResponse = await fetch(
        `${STRAPI_BASE_URL}/api/user-profiles?${roleQuery}`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        recipientIds = (roleData.data || []).map((user: any) => user.id);
      }
    }

    if (recipientIds.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron destinatarios" },
        { status: 400 }
      );
    }

    // Crear una notificación para cada destinatario
    const timestamp = new Date().toISOString();
    const notifications = await Promise.all(
      recipientIds.map(async (recipientId) => {
        const notificationData = {
          title,
          description: description || null,
          type,
          isRead: false,
          timestamp,
          recipient: recipientId,
        };

        // Log para depuración
        console.log('📤 [notifications POST] Enviando notificación:', {
          type,
          hasReminderType: false,
          hasModule: false,
          title,
          hasRecipient: !!recipientId,
        });

        const createResponse = await fetch(
          `${STRAPI_BASE_URL}/api/notifications`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: notificationData }),
            cache: "no-store",
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error(`Error creando notificación para usuario ${recipientId}:`, errorText);
          return null;
        }

        return await createResponse.json();
      })
    );

    const successfulNotifications = notifications.filter(n => n !== null);

    return NextResponse.json({
      success: true,
      message: `Se crearon ${successfulNotifications.length} notificación(es)`,
      data: successfulNotifications,
    });
  } catch (error) {
    console.error("Error creando notificaciones:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
