import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";
import qs from "qs";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET - Obtener un perfil de usuario por ID
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const query = qs.stringify({
      fields: ["id", "documentId", "displayName", "email", "phone", "role", "department", "bio", "address", "dateOfBirth", "hireDate", "identificationNumber", "emergencyContactName", "emergencyContactPhone", "linkedin", "workSchedule", "specialties", "driverLicense"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
        assignedVehicles: {
          fields: ["id", "documentId", "name", "vin", "brand", "model", "year"],
          populate: {
            image: {
              fields: ["url", "alternativeText"],
            },
          },
        },
        interestedVehicles: {
          fields: ["id", "documentId", "name", "vin", "brand", "model", "year"],
          populate: {
            image: {
              fields: ["url", "alternativeText"],
            },
          },
        },
        assignedReminders: {
          fields: ["id", "documentId", "title", "description", "reminderType", "scheduledDate", "recurrencePattern", "recurrenceEndDate", "isActive", "isCompleted", "lastTriggered", "nextTrigger", "authorDocumentId", "createdAt", "updatedAt"],
          populate: {
            vehicle: {
              fields: ["id", "documentId", "name"],
            },
          },
        },
      },
    });

    const response = await fetch(
      `${STRAPI_BASE_URL}/api/user-profiles/${id}?${query}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {
        errorText = response.statusText || "Error desconocido";
      }
      console.error("Error de Strapi:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      return NextResponse.json(
        { error: `Error obteniendo perfil de usuario: ${errorText || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Verificar que la respuesta tenga la estructura esperada
    if (!data || !data.data) {
      console.error("Respuesta de Strapi sin estructura esperada:", data);
      return NextResponse.json(
        { error: "La respuesta del servidor no tiene el formato esperado" },
        { status: 500 }
      );
    }
    
    const userData = data.data;
    
    // Obtener el autor de cada recordatorio si existen
    if (userData.assignedReminders && Array.isArray(userData.assignedReminders)) {
      const remindersWithAuthor = await Promise.all(
        userData.assignedReminders.map(async (reminder: any) => {
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
      
      userData.assignedReminders = remindersWithAuthor;
    }
    
    return NextResponse.json({ data: userData });
  } catch (error) {
    console.error("Error obteniendo perfil de usuario:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar un perfil de usuario
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    if (!body?.data) {
      return NextResponse.json(
        { error: "Payload inválido. Envía los campos dentro de data." },
        { status: 400 }
      );
    }

    // Limpiar campos de fecha: convertir strings vacías a null
    const dateFields = ['dateOfBirth', 'hireDate'];
    const cleanedData = { ...body.data };
    for (const field of dateFields) {
      if (cleanedData[field] === '' || cleanedData[field] === undefined) {
        cleanedData[field] = null;
      }
    }

    const response = await fetch(
      `${STRAPI_BASE_URL}/api/user-profiles/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: cleanedData }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error actualizando perfil de usuario: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("Error actualizando perfil de usuario:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un perfil de usuario
export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const response = await fetch(
      `${STRAPI_BASE_URL}/api/user-profiles/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error eliminando perfil de usuario: ${errorText || response.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando perfil de usuario:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
