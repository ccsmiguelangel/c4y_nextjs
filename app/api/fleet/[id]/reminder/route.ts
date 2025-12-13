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

    if (!vehicleId) {
      return NextResponse.json(
        { error: "No se pudo obtener el ID del vehículo." },
        { status: 404 }
      );
    }

    // Obtener los recordatorios del vehículo usando notifications como fuente principal
    const reminderQuery = qs.stringify({
      filters: {
        type: { $eq: "reminder" },
        module: { $eq: "fleet" },
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

    // Buscar el usuario para cada recordatorio usando authorDocumentId
    const remindersWithAuthor = await Promise.all(
      (reminderData.data || []).map(async (reminder: any) => {
        if (reminder.authorDocumentId) {
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
export async function POST(request: Request, context: RouteContext) {
  console.log("🚀 POST /api/fleet/[id]/reminder ejecutado");
  try {
    const body = (await request.json()) as { data?: FleetReminderPayload };
    
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
    
    // Agregar usuarios asignados si se proporcionan
    if (body.data.assignedUserIds && Array.isArray(body.data.assignedUserIds) && body.data.assignedUserIds.length > 0) {
      reminderData.assignedUsers = body.data.assignedUserIds;
    }

    // Crear el recordatorio usando notifications como fuente principal
    // El controller manejará automáticamente las validaciones para type='reminder'
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
