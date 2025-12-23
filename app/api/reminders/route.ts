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
      fields: ["documentId", "displayName", "email"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
      },
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
      avatar: profile.avatar,
    };
  } catch (error) {
    // Manejar errores de conexión específicamente
    if (error instanceof Error && 'code' in error && error.code === 'ECONNREFUSED') {
      console.error("❌ Error de conexión: Strapi no está corriendo o no es accesible en", STRAPI_BASE_URL);
      console.error("   Por favor, asegúrate de que el servidor de Strapi esté corriendo con: cd backend && npm run develop");
    } else {
      console.error("Error obteniendo user-profile actual:", error);
    }
    return null;
  }
}

// GET - Obtener los recordatorios del usuario logueado
export async function GET() {
  try {
    // Obtener el usuario actual
    const currentUser = await getCurrentUserProfile();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Obtener todos los recordatorios (notificaciones con type='reminder')
    // Primero buscar todos los recordatorios y luego filtrar en el código
    // porque el filtro $or con assignedUsers puede no funcionar correctamente en Strapi
    const reminderQuery = qs.stringify({
      filters: {
        type: { $eq: "reminder" },
      },
      fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "createdAt", "updatedAt", "module", "tags"],
      populate: {
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
        assignedUsers: {
          fields: ["id", "documentId", "displayName", "email"],
          populate: {
            avatar: {
              fields: ["url", "alternativeText"],
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
      },
      sort: ["nextTrigger:asc"],
      pagination: {
        pageSize: 50, // Limitar a 50 recordatorios más próximos
      },
    });

    const reminderResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications?${reminderQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!reminderResponse.ok) {
      if (reminderResponse.status === 404) {
        console.warn("Tipo de contenido 'notifications' no encontrado en Strapi. Retornando array vacío.");
        return NextResponse.json({ data: [] });
      }
      
      const errorText = await reminderResponse.text();
      throw new Error(`No se pudieron obtener los recordatorios: ${errorText || reminderResponse.statusText}`);
    }

    const reminderData = await reminderResponse.json();

    // Primero filtrar notificaciones duplicadas: excluir notificaciones individuales que tienen parentReminderId en tags
    // Estas son las notificaciones creadas por syncReminderNotifications para usuarios asignados
    // Solo queremos mostrar el recordatorio principal, no las notificaciones individuales
    const filteredReminders = (reminderData.data || []).filter((reminder: any) => {
      // VALIDACIÓN CRÍTICA: Excluir notificaciones individuales de recordatorios
      // Las notificaciones individuales tienen parentReminderId en tags Y recipient
      // Los recordatorios principales NO tienen parentReminderId en tags
      if (reminder.type === 'reminder') {
        // Si tiene recipient, es una notificación individual y debe ser excluida
        if (reminder.recipient !== undefined && reminder.recipient !== null) {
          return false;
        }
        
        try {
          const tags = typeof reminder.tags === 'string' 
            ? JSON.parse(reminder.tags) 
            : reminder.tags;
          
          // Si tiene parentReminderId (como número, string o cualquier valor truthy), es una notificación individual
          if (tags && (tags.parentReminderId !== undefined && tags.parentReminderId !== null)) {
            return false;
          }
        } catch (error) {
          // Si hay error parseando tags, incluir la notificación por seguridad
          console.warn('Error parseando tags de recordatorio:', error);
        }
      }
      
      // Incluir todas las demás notificaciones
      return true;
    });

    // Filtrar recordatorios que:
    // 1. Tengan al usuario actual en assignedUsers, O
    // 2. El usuario actual sea el autor (authorDocumentId), O
    // 3. El usuario actual sea responsable del vehículo, O
    // 4. El usuario actual sea conductor asignado del vehículo
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
      
      // Log para debug (solo en desarrollo)
      if (process.env.NODE_ENV === 'development' && reminder.title?.includes('Mantenimiento')) {
        console.log('Recordatorio de mantenimiento:', {
          title: reminder.title,
          authorDocumentId: reminder.authorDocumentId,
          currentUserDocumentId: currentUser.documentId,
          isAuthor,
          isAssigned,
          isResponsable,
          isAssignedDriver,
          shouldInclude,
          assignedUsers: reminder.assignedUsers?.map((u: any) => u?.documentId),
        });
      }
      
      return shouldInclude;
    });

    // Eliminar duplicados: si hay múltiples recordatorios con el mismo título y vehículo,
    // mantener solo el más reciente (basado en createdAt o id)
    const remindersByKey = new Map<string, any>();
    
    for (const reminder of userReminders) {
      // Crear una clave única basada en título y vehículo
      const vehicleId = reminder.fleetVehicle?.id || reminder.fleetVehicle?.documentId || 'unknown';
      const key = `${reminder.title}-${vehicleId}`;
      
      const existing = remindersByKey.get(key);
      
      if (!existing) {
        // No existe, agregarlo
        remindersByKey.set(key, reminder);
      } else {
        // Ya existe, mantener el más reciente (mayor id o createdAt más reciente)
        const existingId = existing.id || 0;
        const newId = reminder.id || 0;
        const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const newDate = reminder.createdAt ? new Date(reminder.createdAt).getTime() : 0;
        
        // Si el nuevo tiene mayor ID o fecha más reciente, reemplazar
        if (newId > existingId || newDate > existingDate) {
          remindersByKey.set(key, reminder);
        }
      }
    }
    
    const uniqueReminders = Array.from(remindersByKey.values());

    // Buscar el usuario para cada recordatorio usando authorDocumentId
    const remindersWithAuthor = await Promise.all(
      uniqueReminders.map(async (reminder: any) => {
        // Si el autor no está populado pero tenemos authorDocumentId, obtenerlo
        if (!reminder.author && reminder.authorDocumentId) {
          try {
            const authorQuery = qs.stringify({
              filters: {
                documentId: { $eq: reminder.authorDocumentId },
              },
              fields: ["id", "documentId", "displayName", "email"],
              populate: {
                avatar: {
                  fields: ["url", "alternativeText"],
                },
              },
            });

            const authorResponse = await fetch(
              `${STRAPI_BASE_URL}/api/user-profiles?${authorQuery}`,
              {
                headers: {
                  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
                },
                cache: "no-store",
              }
            );

            if (authorResponse.ok) {
              const authorData = await authorResponse.json();
              if (authorData.data?.[0]) {
                reminder.author = authorData.data[0];
              }
            }
          } catch (error) {
            console.error("Error obteniendo autor para recordatorio:", error);
          }
        }
        
        // Mapear fleetVehicle a vehicle para compatibilidad con el código existente
        if (reminder.fleetVehicle) {
          reminder.vehicle = reminder.fleetVehicle;
        }
        
        return reminder;
      })
    );

    return NextResponse.json({ data: remindersWithAuthor });
  } catch (error) {
    console.error("Error obteniendo recordatorios:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
