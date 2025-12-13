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
    console.error("Error obteniendo user-profile actual:", error);
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

    // Obtener todos los recordatorios y filtrar por el usuario actual
    const reminderQuery = qs.stringify({
      fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "createdAt", "updatedAt"],
      populate: {
        vehicle: {
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
      },
      sort: ["nextTrigger:asc"],
      pagination: {
        pageSize: 50, // Limitar a 50 recordatorios más próximos
      },
    });

    const reminderResponse = await fetch(
      `${STRAPI_BASE_URL}/api/fleet-reminders?${reminderQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!reminderResponse.ok) {
      if (reminderResponse.status === 404) {
        console.warn("Tipo de contenido 'fleet-reminders' no encontrado en Strapi. Retornando array vacío.");
        return NextResponse.json({ data: [] });
      }
      
      const errorText = await reminderResponse.text();
      throw new Error(`No se pudieron obtener los recordatorios: ${errorText || reminderResponse.statusText}`);
    }

    const reminderData = await reminderResponse.json();

    // Filtrar recordatorios que:
    // 1. Tengan al usuario actual en assignedUsers, O
    // 2. El usuario actual sea el autor (authorDocumentId), O
    // 3. El usuario actual sea responsable del vehículo, O
    // 4. El usuario actual sea conductor asignado del vehículo
    const userReminders = (reminderData.data || []).filter((reminder: any) => {
      // Verificar si el usuario actual es el autor del recordatorio
      const isAuthor = reminder.authorDocumentId === currentUser.documentId;
      
      // Verificar si el usuario actual está en la lista de usuarios asignados
      const isAssigned = reminder.assignedUsers?.some(
        (user: any) => user.documentId === currentUser.documentId
      );
      
      // Verificar si el usuario actual es responsable del vehículo
      const isResponsable = reminder.vehicle?.responsables?.some(
        (resp: any) => resp.documentId === currentUser.documentId
      );
      
      // Verificar si el usuario actual es conductor asignado del vehículo
      const isAssignedDriver = reminder.vehicle?.assignedDrivers?.some(
        (driver: any) => driver.documentId === currentUser.documentId
      );
      
      return isAuthor || isAssigned || isResponsable || isAssignedDriver;
    });

    // Buscar el usuario para cada recordatorio usando authorDocumentId
    const remindersWithAuthor = await Promise.all(
      userReminders.map(async (reminder: any) => {
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
    console.error("Error obteniendo recordatorios:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
