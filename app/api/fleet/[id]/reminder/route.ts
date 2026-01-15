import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";
import qs from "qs";
import { fetchFleetVehicleByIdFromStrapi } from "@/lib/fleet";
import type { FleetReminderPayload } from "@/validations/types";

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
    console.error("Error obteniendo user-profile actual:", error);
    return null;
  }
}

// Función helper para convertir documentIds a ids numéricos
async function convertDocumentIdsToIds(documentIds: string[]): Promise<number[]> {
  if (!documentIds || documentIds.length === 0) {
    return [];
  }

  try {
    const query = qs.stringify({
      filters: {
        documentId: { $in: documentIds },
      },
      fields: ["id", "documentId"],
    });

    const response = await fetch(
      `${STRAPI_BASE_URL}/api/user-profiles?${query}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.warn("Error convirtiendo documentIds a ids:", response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map((profile: any) => profile.id).filter((id: any) => id != null);
  } catch (error) {
    console.error("Error convirtiendo documentIds a ids:", error);
    return [];
  }
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET - Obtener todos los recordatorios de un vehículo
export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const vehicle = await fetchFleetVehicleByIdFromStrapi(id);
    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 }
      );
    }

    const vehicleQuery = qs.stringify({
      filters: {
        documentId: { $eq: id },
      },
      fields: ["id"],
    });

    const vehicleResponse = await fetch(
      `${STRAPI_BASE_URL}/api/fleets?${vehicleQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!vehicleResponse.ok) {
      throw new Error("No se pudo obtener el vehículo");
    }

    const vehicleData = await vehicleResponse.json();
    const vehicleId = vehicleData.data?.[0]?.id;
    const vehicleDocumentId = id; // El documentId del vehículo es el id del parámetro

    if (!vehicleId) {
      return NextResponse.json(
        { error: "No se pudo obtener el ID del vehículo." },
        { status: 404 }
      );
    }

    // Obtener los recordatorios del vehículo usando notifications como fuente principal
    // Buscar por ID numérico (relación manyToOne)
    // Buscar todos los recordatorios del vehículo (con o sin module)
    const reminderQuery = qs.stringify({
      filters: {
        type: { $eq: "reminder" },
        fleetVehicle: { id: { $eq: vehicleId } },
      },
      fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "module", "tags", "createdAt", "updatedAt"],
      populate: {
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
        fleetVehicle: {
          fields: ["id", "documentId", "name"],
        },
      },
      sort: ["nextTrigger:asc"],
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
      // Si es 404, el tipo de contenido no existe todavía en Strapi
      // Retornar array vacío en lugar de error
      if (reminderResponse.status === 404) {
        console.warn("Tipo de contenido 'notifications' no encontrado en Strapi. Retornando array vacío.");
        return NextResponse.json({ data: [] });
      }
      
      const errorText = await reminderResponse.text();
      console.error("Error obteniendo recordatorios de Strapi:", {
        status: reminderResponse.status,
        statusText: reminderResponse.statusText,
        errorText,
      });
      throw new Error(`No se pudieron obtener los recordatorios: ${errorText || reminderResponse.statusText}`);
    }

    const reminderData = await reminderResponse.json();
    
    // Log para depuración (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GET /api/fleet/${id}/reminder] Recordatorios encontrados antes de filtrar:`, reminderData.data?.length || 0);
      if (reminderData.data && reminderData.data.length > 0) {
        console.log('Primer recordatorio de ejemplo:', {
          id: reminderData.data[0].id,
          documentId: reminderData.data[0].documentId,
          title: reminderData.data[0].title,
          fleetVehicle: reminderData.data[0].fleetVehicle,
          module: reminderData.data[0].module,
          tags: reminderData.data[0].tags,
        });
      }
    }
    
    // Filtrar recordatorios: excluir notificaciones individuales que tienen parentReminderId en tags
    // Solo queremos mostrar los recordatorios principales, no las notificaciones individuales
    // También verificar que el recordatorio pertenezca al vehículo correcto
    let reminders = (reminderData.data || []).filter((reminder: any) => {
      // VALIDACIÓN CRÍTICA: Excluir notificaciones individuales
      // Las notificaciones individuales tienen parentReminderId en tags Y recipient
      // Los recordatorios principales NO tienen parentReminderId en tags NI recipient
      if (reminder.type === 'reminder') {
        // Si tiene recipient (incluso si es un objeto populado), es una notificación individual
        if (reminder.recipient !== undefined && reminder.recipient !== null) {
          // Log en desarrollo para depuración
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [fleet/${id}/reminder] Excluyendo notificación individual (tiene recipient):`, {
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
              console.log(`🔍 [fleet/${id}/reminder] Excluyendo notificación individual (tiene parentReminderId):`, {
                id: reminder.id,
                documentId: reminder.documentId,
                title: reminder.title,
                parentReminderId: tags.parentReminderId,
              });
            }
            return false;
          }
        } catch (error) {
          // Si hay error parseando tags, continuar con la verificación
          console.warn('Error parseando tags de recordatorio:', error);
        }
      }
      
      // Verificar que el recordatorio pertenezca al vehículo correcto
      // Verificar por fleetVehicle.id (relación directa)
      if (reminder.fleetVehicle?.id === vehicleId) {
        return true;
      }
      
      // Verificar por tags.vehicleId (fallback)
      if (reminder.tags) {
        try {
          const tags = typeof reminder.tags === 'string' 
            ? JSON.parse(reminder.tags) 
            : reminder.tags;
          if (tags?.vehicleId === vehicleId) {
            return true;
          }
        } catch {
          // Si hay error parseando tags, continuar
        }
      }
      
      // Si no coincide con ninguna verificación, excluir
      return false;
    });
    
    // Si no se encontraron recordatorios, intentar búsqueda más amplia (fallback)
    // Esto puede ser necesario si el recordatorio no tiene module o fleetVehicle correctamente configurado
    if (reminders.length === 0) {
      // Fallback: buscar todos los recordatorios y filtrar manualmente
      const fallbackQuery = qs.stringify({
        filters: {
          type: { $eq: "reminder" },
        },
        fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "module", "tags", "createdAt", "updatedAt"],
        populate: {
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
          fleetVehicle: {
            fields: ["id", "documentId", "name"],
          },
        },
        sort: ["nextTrigger:asc"],
        pagination: {
          pageSize: 100, // Buscar más recordatorios en el fallback
        },
      });
      
      const fallbackResponse = await fetch(
        `${STRAPI_BASE_URL}/api/notifications?${fallbackQuery}`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          },
          cache: "no-store",
        }
      );
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        // Filtrar manualmente por tags.vehicleId o fleetVehicle
        // Y también excluir notificaciones individuales con parentReminderId
        reminders = (fallbackData.data || []).filter((reminder: any) => {
          // VALIDACIÓN CRÍTICA: Excluir notificaciones individuales
          if (reminder.type === 'reminder') {
            // Si tiene recipient (incluso si es un objeto populado), es una notificación individual
            if (reminder.recipient !== undefined && reminder.recipient !== null) {
              // Log en desarrollo para depuración
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔍 [fleet/${id}/reminder] Excluyendo notificación individual en fallback (tiene recipient):`, {
                  id: reminder.id,
                  documentId: reminder.documentId,
                  title: reminder.title,
                  recipient: reminder.recipient,
                });
              }
              return false;
            }
            
            try {
              const tags = typeof reminder.tags === 'string' ? JSON.parse(reminder.tags) : reminder.tags;
              // Si tiene parentReminderId (como número, string o cualquier valor truthy), es una notificación individual
              if (tags && (tags.parentReminderId !== undefined && tags.parentReminderId !== null)) {
                // Log en desarrollo para depuración
                if (process.env.NODE_ENV === 'development') {
                  console.log(`🔍 [fleet/${id}/reminder] Excluyendo notificación individual en fallback (tiene parentReminderId):`, {
                    id: reminder.id,
                    documentId: reminder.documentId,
                    title: reminder.title,
                    parentReminderId: tags.parentReminderId,
                  });
                }
                return false; // Excluir notificaciones individuales
              }
            } catch {
              // Si hay error parseando tags, continuar con la verificación
            }
          }
          
          // Verificar si tiene fleetVehicle con el ID correcto
          if (reminder.fleetVehicle?.id === vehicleId) {
            return true;
          }
          // Verificar tags si fleetVehicle no está disponible
          if (reminder.tags) {
            try {
              const tags = typeof reminder.tags === 'string' ? JSON.parse(reminder.tags) : reminder.tags;
              // Verificar tanto vehicleId (numérico) como documentId (string)
              if (tags?.vehicleId === vehicleId || tags?.vehicleId === vehicleDocumentId) {
                return true;
              }
            } catch {
              return false;
            }
          }
          return false;
        });
      }
    }

    // Log para depuración (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GET /api/fleet/${id}/reminder] Recordatorios después de filtrar:`, reminders.length);
      if (reminders.length > 0) {
        console.log(`[GET /api/fleet/${id}/reminder] IDs de recordatorios devueltos:`, 
          reminders.map(r => ({ id: r.id, documentId: r.documentId, title: r.title }))
        );
      }
    }
    
    // Eliminar duplicados: si hay múltiples recordatorios con el mismo título y vehículo,
    // mantener solo el más reciente (basado en createdAt o id)
    // También verificar por documentId para evitar duplicados exactos
    const remindersByKey = new Map<string, any>();
    const remindersByDocumentId = new Map<string, any>();
    
    for (const reminder of reminders) {
      // Primera verificación: si ya vimos este documentId, saltarlo (duplicado exacto)
      if (reminder.documentId) {
        if (remindersByDocumentId.has(reminder.documentId)) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [fleet/${id}/reminder] Duplicado por documentId, saltando:`, {
              documentId: reminder.documentId,
              title: reminder.title,
              id: reminder.id,
            });
          }
          continue;
        }
        remindersByDocumentId.set(reminder.documentId, reminder);
      }
      
      // Segunda verificación: crear una clave única basada en título y vehículo
      const vehicleId = reminder.fleetVehicle?.id || reminder.fleetVehicle?.documentId || 'unknown';
      const key = `${reminder.title?.trim() || ''}-${vehicleId}`;
      
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
            console.log(`🔍 [fleet/${id}/reminder] Reemplazando recordatorio duplicado:`, {
              key,
              existingId: existing.id,
              newId: reminder.id,
              title: reminder.title,
            });
          }
          remindersByKey.set(key, reminder);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [fleet/${id}/reminder] Manteniendo recordatorio existente (más reciente):`, {
              key,
              existingId: existing.id,
              newId: reminder.id,
              title: reminder.title,
            });
          }
        }
      }
    }
    
    const uniqueReminders = Array.from(remindersByKey.values());
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [fleet/${id}/reminder] Resumen de deduplicación:`, {
        totalDespuésDeFiltro: reminders.length,
        únicosDespuésDeDeduplicación: uniqueReminders.length,
        eliminados: reminders.length - uniqueReminders.length,
      });
    }
    
    // Mapear recordatorios y agregar información adicional
    const remindersWithAuthor = await Promise.all(
      uniqueReminders.map(async (reminder: any) => {
        // Mapear fleetVehicle a vehicle para compatibilidad con código existente
        if (reminder.fleetVehicle) {
          reminder.vehicle = reminder.fleetVehicle;
        }
        
        // Obtener autor si no está populado
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
        
        return reminder;
      })
    );

    return NextResponse.json({ data: remindersWithAuthor });
  } catch (error) {
    console.error("Error obteniendo recordatorios del vehículo:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo recordatorio
export async function POST(
  request: Request,
  context: RouteContext
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  console.log("🚀 POST /api/fleet/[id]/reminder ejecutado", { 
    requestId,
    timestamp: new Date().toISOString(),
    url: request.url,
  });
  try {
    const body = (await request.json()) as { data?: FleetReminderPayload };
    
    console.log("📥 Datos recibidos en POST:", {
      requestId,
      title: body.data?.title,
      reminderType: body.data?.reminderType,
      scheduledDate: body.data?.scheduledDate,
      assignedUserIdsCount: body.data?.assignedUserIds?.length || 0,
    });
    
    if (!body?.data) {
      return NextResponse.json(
        { error: "Los datos del recordatorio son requeridos." },
        { status: 400 }
      );
    }

    // Validar título
    if (!body.data.title || body.data.title.trim() === "") {
      return NextResponse.json(
        { error: "El título es requerido." },
        { status: 400 }
      );
    }

    // Validar fecha programada
    if (!body.data.scheduledDate) {
      return NextResponse.json(
        { error: "La fecha programada es requerida." },
        { status: 400 }
      );
    }

    // Validar tipo de recordatorio
    if (!body.data.reminderType || !['unique', 'recurring'].includes(body.data.reminderType)) {
      return NextResponse.json(
        { error: "Tipo de recordatorio inválido." },
        { status: 400 }
      );
    }

    // Si es recurrente, validar recurrencePattern
    if (body.data.reminderType === 'recurring') {
      if (!body.data.recurrencePattern || !['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].includes(body.data.recurrencePattern)) {
        return NextResponse.json(
          { error: "Patrón de recurrencia requerido para recordatorios recurrentes." },
          { status: 400 }
        );
      }
    }

    const { id } = await context.params;

    // Obtener el vehículo para obtener su ID numérico
    const vehicleQuery = qs.stringify({
      filters: {
        documentId: { $eq: id },
      },
      fields: ["id"],
    });

    const vehicleResponse = await fetch(
      `${STRAPI_BASE_URL}/api/fleets?${vehicleQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!vehicleResponse.ok) {
      throw new Error("No se pudo obtener el vehículo");
    }

    const vehicleData = await vehicleResponse.json();
    const vehicleId = vehicleData.data?.[0]?.id;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 }
      );
    }

    // Obtener el vehículo completo con responsables y conductores asignados
    const vehicleFullQuery = qs.stringify({
      filters: {
        id: { $eq: vehicleId },
      },
      fields: ["id"],
      populate: {
        responsables: {
          fields: ["id", "documentId"],
        },
        assignedDrivers: {
          fields: ["id", "documentId"],
        },
      },
    });

    const vehicleFullResponse = await fetch(
      `${STRAPI_BASE_URL}/api/fleets?${vehicleFullQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    let vehicleResponsablesIds: number[] = [];
    let vehicleAssignedDriversIds: number[] = [];

    if (vehicleFullResponse.ok) {
      const vehicleFullData = await vehicleFullResponse.json();
      const vehicle = vehicleFullData.data?.[0];
      
      if (vehicle) {
        // Obtener IDs de responsables
        if (vehicle.responsables && Array.isArray(vehicle.responsables)) {
          vehicleResponsablesIds = vehicle.responsables
            .map((resp: any) => resp.id)
            .filter((id: any) => id != null);
        }
        
        // Obtener IDs de conductores asignados
        if (vehicle.assignedDrivers && Array.isArray(vehicle.assignedDrivers)) {
          vehicleAssignedDriversIds = vehicle.assignedDrivers
            .map((driver: any) => driver.id)
            .filter((id: any) => id != null);
        }
      }
    }

    const currentUserProfile = await getCurrentUserProfile();
    
    let authorDocumentId = body.data.authorDocumentId && body.data.authorDocumentId !== null 
      ? body.data.authorDocumentId 
      : undefined;
    
    if (!authorDocumentId) {
      authorDocumentId = currentUserProfile?.documentId;
    }

    if (!authorDocumentId) {
      return NextResponse.json(
        { error: "No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    // Preparar los datos del recordatorio usando notifications como fuente principal
    const reminderData: {
      title: string;
      description?: string;
      type: string;
      module: string;
      reminderType: string;
      scheduledDate: string;
      recurrencePattern?: string;
      recurrenceEndDate?: string;
      isActive: boolean;
      nextTrigger: string;
      timestamp: string;
      authorDocumentId: string;
      fleetVehicle: number;
      assignedUsers?: number[];
      tags?: any;
    } = {
      title: body.data.title.trim(),
      type: "reminder",
      module: "fleet",
      reminderType: body.data.reminderType,
      scheduledDate: body.data.scheduledDate,
      isActive: true,
      nextTrigger: body.data.scheduledDate, // Inicialmente igual a scheduledDate
      timestamp: body.data.scheduledDate,
      authorDocumentId: authorDocumentId,
      fleetVehicle: vehicleId,
      tags: {
        module: "fleet",
        vehicleId: vehicleId,
      },
    };
    
    if (body.data.description) {
      reminderData.description = body.data.description.trim();
    }
    
    if (body.data.reminderType === 'recurring' && body.data.recurrencePattern) {
      reminderData.recurrencePattern = body.data.recurrencePattern;
    }
    
    if (body.data.recurrenceEndDate) {
      reminderData.recurrenceEndDate = body.data.recurrenceEndDate;
    }
    
    // Agregar usuarios asignados: combinar usuarios seleccionados manualmente + responsables + conductores del vehículo
    const allAssignedUserIds = new Set<number>();
    
    // 1. Agregar usuarios seleccionados manualmente (si se proporcionan)
    if (body.data.assignedUserIds && Array.isArray(body.data.assignedUserIds) && body.data.assignedUserIds.length > 0) {
      // Verificar si son documentIds (strings) o ids numéricos
      const firstId = body.data.assignedUserIds[0];
      if (typeof firstId === 'string' && !/^\d+$/.test(firstId)) {
        // Son documentIds, convertir a ids numéricos
        const numericIds = await convertDocumentIdsToIds(body.data.assignedUserIds);
        numericIds.forEach(id => allAssignedUserIds.add(id));
      } else {
        // Ya son ids numéricos o strings numéricos
        body.data.assignedUserIds.forEach((id: any) => {
          const numId = typeof id === 'string' ? parseInt(id, 10) : id;
          if (!isNaN(numId)) {
            allAssignedUserIds.add(numId);
          }
        });
      }
    }
    
    // 2. Agregar responsables del vehículo automáticamente
    vehicleResponsablesIds.forEach(id => allAssignedUserIds.add(id));
    
    // 3. Agregar conductores asignados del vehículo automáticamente
    vehicleAssignedDriversIds.forEach(id => allAssignedUserIds.add(id));
    
    // Convertir Set a Array
    if (allAssignedUserIds.size > 0) {
      reminderData.assignedUsers = Array.from(allAssignedUserIds);
    }

    // Verificar si ya existe un recordatorio con el mismo título y vehículo para evitar duplicados
    // Esto es especialmente importante para recordatorios de mantenimiento
    // Buscar sin filtrar por module primero para ser más flexible
    const existingReminderQuery = qs.stringify({
      filters: {
        type: { $eq: "reminder" },
        fleetVehicle: { id: { $eq: vehicleId } },
        title: { $eq: reminderData.title },
        // Excluir notificaciones individuales (con parentReminderId) - esto se hace después
      },
      fields: ["id", "documentId", "title", "tags", "module", "createdAt"],
      sort: ["createdAt:desc"], // Ordenar por más reciente primero
    });

    const existingReminderResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications?${existingReminderQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (existingReminderResponse.ok) {
      const existingReminderData = await existingReminderResponse.json();
      // Filtrar notificaciones individuales (con parentReminderId)
      const existingMainReminders = (existingReminderData.data || []).filter((reminder: any) => {
        try {
          const tags = typeof reminder.tags === 'string' 
            ? JSON.parse(reminder.tags) 
            : reminder.tags;
          // Solo incluir recordatorios principales (sin parentReminderId)
          return !tags || !tags.parentReminderId;
        } catch {
          return true; // Si hay error parseando, incluir por seguridad
        }
      });

      if (existingMainReminders.length > 0) {
        // Ya existe un recordatorio con el mismo título y vehículo
        // Retornar el existente en lugar de crear uno nuevo
        // Usar el más reciente si hay múltiples
        const existingReminder = existingMainReminders[0];
        console.log("⚠️ Recordatorio duplicado detectado, retornando el existente:", {
          id: existingReminder.id,
          documentId: existingReminder.documentId,
          title: existingReminder.title,
          module: existingReminder.module,
          createdAt: existingReminder.createdAt,
          totalFound: existingMainReminders.length,
        });
        
        // Obtener el recordatorio completo
        const getReminderQuery = qs.stringify({
          fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "module", "tags", "createdAt", "updatedAt"],
          populate: {
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
            fleetVehicle: {
              fields: ["id", "documentId", "name"],
            },
          },
        });

        const getReminderResponse = await fetch(
          `${STRAPI_BASE_URL}/api/notifications/${existingReminder.id}?${getReminderQuery}`,
          {
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            cache: "no-store",
          }
        );

        if (getReminderResponse.ok) {
          const reminderDataResponse = await getReminderResponse.json();
          const fullReminderData = reminderDataResponse.data;
          
          // Mapear fleetVehicle a vehicle para compatibilidad
          if (fullReminderData.fleetVehicle) {
            fullReminderData.vehicle = fullReminderData.fleetVehicle;
          }
          
          return NextResponse.json({ data: fullReminderData });
        }
      }
    }

    // Verificar una vez más ANTES de crear para evitar condiciones de carrera
    // Esta segunda verificación ayuda a prevenir duplicados si dos peticiones llegan casi simultáneamente
    const finalCheckQuery = qs.stringify({
      filters: {
        type: { $eq: "reminder" },
        fleetVehicle: { id: { $eq: vehicleId } },
        title: { $eq: reminderData.title },
      },
      fields: ["id", "documentId", "title", "tags"],
      sort: ["createdAt:desc"],
      pagination: { pageSize: 1 },
    });

    const finalCheckResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications?${finalCheckQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (finalCheckResponse.ok) {
      const finalCheckData = await finalCheckResponse.json();
      const finalMainReminders = (finalCheckData.data || []).filter((reminder: any) => {
        try {
          const tags = typeof reminder.tags === 'string' 
            ? JSON.parse(reminder.tags) 
            : reminder.tags;
          return !tags || !tags.parentReminderId;
        } catch {
          return true;
        }
      });

      if (finalMainReminders.length > 0) {
        const existingReminder = finalMainReminders[0];
        console.log("⚠️ Recordatorio duplicado detectado en verificación final, retornando el existente:", {
          id: existingReminder.id,
          documentId: existingReminder.documentId,
          title: existingReminder.title,
          timeSinceStart: `${Date.now() - startTime}ms`,
        });
        
        // Obtener el recordatorio completo y retornarlo
        const getReminderQuery = qs.stringify({
          fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "module", "tags", "createdAt", "updatedAt"],
          populate: {
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
            fleetVehicle: {
              fields: ["id", "documentId", "name"],
            },
          },
        });

        const getReminderResponse = await fetch(
          `${STRAPI_BASE_URL}/api/notifications/${existingReminder.id}?${getReminderQuery}`,
          {
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            cache: "no-store",
          }
        );

        if (getReminderResponse.ok) {
          const reminderDataResponse = await getReminderResponse.json();
          const fullReminderData = reminderDataResponse.data;
          
          if (fullReminderData.fleetVehicle) {
            fullReminderData.vehicle = fullReminderData.fleetVehicle;
          }
          
          return NextResponse.json({ data: fullReminderData });
        }
      }
    }

    // Crear el recordatorio usando notifications como fuente principal
    // El controller manejará automáticamente las validaciones para type='reminder'
    console.log("✅ Creando nuevo recordatorio:", {
      requestId,
      title: reminderData.title,
      vehicleId,
      timeSinceStart: `${Date.now() - startTime}ms`,
      assignedUsersCount: reminderData.assignedUsers?.length || 0,
      assignedUsers: reminderData.assignedUsers,
    });
    
    // VALIDACIÓN FINAL: Verificar una última vez que no existe antes de crear
    // Esto previene condiciones de carrera donde dos peticiones pasan la verificación anterior
    const lastCheckQuery = qs.stringify({
      filters: {
        type: { $eq: "reminder" },
        fleetVehicle: { id: { $eq: vehicleId } },
        title: { $eq: reminderData.title },
      },
      fields: ["id", "documentId", "title", "tags"],
      sort: ["createdAt:desc"],
      pagination: { pageSize: 1 },
    });

    const lastCheckResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications?${lastCheckQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (lastCheckResponse.ok) {
      const lastCheckData = await lastCheckResponse.json();
      const lastMainReminders = (lastCheckData.data || []).filter((reminder: any) => {
        try {
          const tags = typeof reminder.tags === 'string' 
            ? JSON.parse(reminder.tags) 
            : reminder.tags;
          return !tags || !tags.parentReminderId;
        } catch {
          return true;
        }
      });

      if (lastMainReminders.length > 0) {
        const existingReminder = lastMainReminders[0];
        console.log("⚠️ Recordatorio duplicado detectado en verificación final antes de crear, retornando el existente:", {
          id: existingReminder.id,
          documentId: existingReminder.documentId,
          title: existingReminder.title,
          timeSinceStart: `${Date.now() - startTime}ms`,
        });
        
        // Obtener el recordatorio completo y retornarlo
        const getReminderQuery = qs.stringify({
          fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "module", "tags", "createdAt", "updatedAt"],
          populate: {
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
            fleetVehicle: {
              fields: ["id", "documentId", "name"],
            },
          },
        });

        const getReminderResponse = await fetch(
          `${STRAPI_BASE_URL}/api/notifications/${existingReminder.id}?${getReminderQuery}`,
          {
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            cache: "no-store",
          }
        );

        if (getReminderResponse.ok) {
          const reminderDataResponse = await getReminderResponse.json();
          const fullReminderData = reminderDataResponse.data;
          
          if (fullReminderData.fleetVehicle) {
            fullReminderData.vehicle = fullReminderData.fleetVehicle;
          }
          
          return NextResponse.json({ data: fullReminderData });
        }
      }
    }
    
    const createResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: reminderData,
        }),
        cache: "no-store",
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      let errorData;
      try {
        errorData = errorText ? JSON.parse(errorText) : { error: { message: "Error desconocido" } };
      } catch {
        errorData = { error: { message: errorText || `Error ${createResponse.status}` } };
      }
      
      console.error("❌ Error creando recordatorio en Strapi:", {
        requestId,
        status: createResponse.status,
        statusText: createResponse.statusText,
        error: errorData,
        title: reminderData.title,
      });
      
      // Si es 404, el tipo de contenido no existe
      if (createResponse.status === 404) {
        throw new Error("El tipo de contenido 'fleet-reminders' no existe en Strapi. Por favor, reinicia el servidor de Strapi.");
      }
      
      // Si es 405, el método no está permitido
      if (createResponse.status === 405) {
        throw new Error("El método POST no está permitido en esta ruta. Por favor, reinicia el servidor de desarrollo.");
      }
      
      throw new Error(errorData.error?.message || errorData.message || `Error ${createResponse.status}: ${createResponse.statusText}`);
    }

    const createdReminder = await createResponse.json();
    const createdReminderData = createdReminder.data;
    
    console.log("✅ Recordatorio creado exitosamente:", {
      requestId,
      id: createdReminderData.id,
      documentId: createdReminderData.documentId,
      title: createdReminderData.title,
      timeSinceStart: `${Date.now() - startTime}ms`,
    });

    // Obtener el recordatorio completo con autor y usuarios asignados usando notifications
    const getReminderQuery = qs.stringify({
      fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "module", "tags", "createdAt", "updatedAt"],
      populate: {
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
        fleetVehicle: {
          fields: ["id", "documentId", "name"],
        },
      },
    });

    const getReminderResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications/${createdReminderData.id}?${getReminderQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (getReminderResponse.ok) {
      const reminderDataResponse = await getReminderResponse.json();
      const fullReminderData = reminderDataResponse.data;
      
      // VALIDACIÓN: Asegurar que el recordatorio creado NO sea una notificación individual
      // Verificar que no tenga parentReminderId en tags ni recipient
      if (fullReminderData.type === 'reminder') {
        try {
          const tags = typeof fullReminderData.tags === 'string' 
            ? JSON.parse(fullReminderData.tags) 
            : fullReminderData.tags;
          
          if (tags && (tags.parentReminderId !== undefined && tags.parentReminderId !== null)) {
            console.error('⚠️ ERROR: Se creó una notificación individual en lugar de un recordatorio principal:', {
              id: fullReminderData.id,
              documentId: fullReminderData.documentId,
              title: fullReminderData.title,
              parentReminderId: tags.parentReminderId,
              recipient: fullReminderData.recipient,
            });
          }
          
          if (fullReminderData.recipient !== undefined && fullReminderData.recipient !== null) {
            console.error('⚠️ ERROR: Se creó una notificación individual (tiene recipient) en lugar de un recordatorio principal:', {
              id: fullReminderData.id,
              documentId: fullReminderData.documentId,
              title: fullReminderData.title,
              recipient: fullReminderData.recipient,
            });
          }
        } catch (error) {
          console.warn('Error verificando tags del recordatorio creado:', error);
        }
      }
      
      // Agregar el autor
      if (currentUserProfile && currentUserProfile.documentId === fullReminderData.authorDocumentId) {
        fullReminderData.author = {
          id: 0,
          documentId: currentUserProfile.documentId,
          displayName: currentUserProfile.displayName || currentUserProfile.email || "Usuario",
          email: currentUserProfile.email,
          avatar: currentUserProfile.avatar,
        };
      } else if (fullReminderData.authorDocumentId) {
        try {
          const authorQuery = qs.stringify({
            filters: {
              documentId: { $eq: fullReminderData.authorDocumentId },
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
              fullReminderData.author = authorData.data[0];
            }
          }
        } catch (error) {
          console.error("Error obteniendo autor para recordatorio creado:", error);
        }
      }
      
      return NextResponse.json({ data: fullReminderData });
    }

    // Fallback: retornar datos básicos
    return NextResponse.json({ data: createdReminderData });
  } catch (error) {
    console.error("Error creando recordatorio del vehículo:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
