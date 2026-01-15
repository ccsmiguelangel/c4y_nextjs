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
      // Los recordatorios principales NO tienen parentReminderId en tags NI recipient
      if (reminder.type === 'reminder') {
        // Si tiene recipient (incluso si es un objeto populado), es una notificación individual
        if (reminder.recipient !== undefined && reminder.recipient !== null) {
          // Log en desarrollo para depuración
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [reminders] Excluyendo notificación individual (tiene recipient):', {
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
              console.log('🔍 [reminders] Excluyendo notificación individual (tiene parentReminderId):', {
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
      }
      
      // Incluir todas las demás notificaciones
      return true;
    });

    // Filtrar recordatorios que:
    // 1. Tengan al usuario actual en assignedUsers, O
    // 2. El usuario actual sea el autor (authorDocumentId), O
    // 3. El usuario actual sea responsable del vehículo, O
    // 4. El usuario actual sea conductor asignado del vehículo
    // IMPORTANTE: Excluir recordatorios completados (isCompleted === true)
    const userReminders = filteredReminders.filter((reminder: any) => {
      // Excluir recordatorios completados (verificar tanto true como valores truthy)
      if (reminder.isCompleted === true || reminder.isCompleted === 1) {
        return false;
      }
      
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
    // También verificar por documentId para evitar duplicados exactos
    const remindersByKey = new Map<string, any>();
    const remindersByDocumentId = new Map<string, any>();
    const remindersByTitleOnly = new Map<string, any[]>(); // Para detectar duplicados por título
    
    for (const reminder of userReminders) {
      // Primera verificación: si ya vimos este documentId, saltarlo (duplicado exacto)
      if (reminder.documentId) {
        if (remindersByDocumentId.has(reminder.documentId)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [reminders] Duplicado por documentId, saltando:', {
              documentId: reminder.documentId,
              title: reminder.title,
              id: reminder.id,
            });
          }
          continue;
        }
        remindersByDocumentId.set(reminder.documentId, reminder);
      }
      
      // Agregar a mapa por título para verificación adicional
      const normalizedTitle = (reminder.title?.trim() || '').toLowerCase();
      if (!remindersByTitleOnly.has(normalizedTitle)) {
        remindersByTitleOnly.set(normalizedTitle, []);
      }
      remindersByTitleOnly.get(normalizedTitle)!.push(reminder);
      
      // Segunda verificación: crear una clave única basada en título y vehículo
      // IMPORTANTE: Si hay múltiples recordatorios con el mismo título pero diferentes vehículos,
      // verificar si alguno tiene 'unknown' y debería tener el mismo vehículo que otro
      // (normalizedTitle ya está definido arriba)
      
      // Buscar si hay otros recordatorios con el mismo título para detectar inconsistencias
      const sameTitleReminders = remindersByTitleOnly.get(normalizedTitle) || [];
      let vehicleId = reminder.fleetVehicle?.documentId || 
                     (reminder.fleetVehicle?.id ? String(reminder.fleetVehicle.id) : null);
      
      // Si este recordatorio no tiene vehículo, pero hay otro con el mismo título que sí lo tiene,
      // usar el vehículo del otro (probablemente es el mismo recordatorio con datos inconsistentes)
      if (!vehicleId && sameTitleReminders.length > 0) {
        const reminderWithVehicle = sameTitleReminders.find((r: any) => 
          r.fleetVehicle?.documentId || r.fleetVehicle?.id
        );
        if (reminderWithVehicle) {
          vehicleId = reminderWithVehicle.fleetVehicle?.documentId || 
                     (reminderWithVehicle.fleetVehicle?.id ? String(reminderWithVehicle.fleetVehicle.id) : null);
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [reminders] Recordatorio sin vehículo, usando vehículo de otro con mismo título:', {
              title: reminder.title,
              foundVehicleId: vehicleId,
            });
          }
        }
      }
      
      // Si aún no hay vehículo, usar 'unknown'
      vehicleId = vehicleId || 'unknown';
      const key = `${normalizedTitle}-${vehicleId}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [reminders] Procesando recordatorio para deduplicación:', {
          key,
          title: reminder.title,
          normalizedTitle,
          vehicleId,
          vehicleDocumentId: reminder.fleetVehicle?.documentId,
          vehicleIdNum: reminder.fleetVehicle?.id,
          hasVehicle: !!reminder.fleetVehicle,
          reminderDocumentId: reminder.documentId,
          reminderId: reminder.id,
        });
      }
      
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
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [reminders] Reemplazando recordatorio duplicado:', {
              key,
              existingId: existing.id,
              existingDocumentId: existing.documentId,
              existingVehicle: existing.fleetVehicle?.documentId || existing.fleetVehicle?.id || 'none',
              newId: reminder.id,
              newDocumentId: reminder.documentId,
              newVehicle: reminder.fleetVehicle?.documentId || reminder.fleetVehicle?.id || 'none',
              title: reminder.title,
            });
          }
          remindersByKey.set(key, reminder);
          // También actualizar en remindersByDocumentId si tiene documentId
          if (reminder.documentId) {
            remindersByDocumentId.set(reminder.documentId, reminder);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [reminders] Manteniendo recordatorio existente (más reciente):', {
              key,
              existingId: existing.id,
              existingDocumentId: existing.documentId,
              existingVehicle: existing.fleetVehicle?.documentId || existing.fleetVehicle?.id || 'none',
              newId: reminder.id,
              newDocumentId: reminder.documentId,
              newVehicle: reminder.fleetVehicle?.documentId || reminder.fleetVehicle?.id || 'none',
              title: reminder.title,
            });
          }
        }
      }
    }
    
    const uniqueReminders = Array.from(remindersByKey.values());
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [reminders] Resumen de deduplicación:', {
        totalDespuésDeFiltro: userReminders.length,
        únicosDespuésDeDeduplicación: uniqueReminders.length,
        eliminados: userReminders.length - uniqueReminders.length,
      });
    }

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
