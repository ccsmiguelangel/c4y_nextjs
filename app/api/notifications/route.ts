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
    // IMPORTANTE: NO incluir notificaciones individuales (con recipient) de recordatorios
    // Solo obtener:
    // 1. Notificaciones manuales con recipient (no son recordatorios)
    // 2. Recordatorios principales donde el usuario esté en assignedUsers (NO tienen recipient)
    // 3. Recordatorios principales donde el usuario sea el autor (NO tienen recipient)
    const notificationQuery = qs.stringify({
      filters: {
        $or: [
          {
            // Notificaciones manuales (no son recordatorios) con recipient
            type: { $ne: "reminder" },
            recipient: {
              documentId: { $eq: currentUser.documentId },
            },
          },
          {
            // Recordatorios principales (NO tienen recipient, NO tienen parentReminderId en tags)
            type: { $eq: "reminder" },
            assignedUsers: {
              documentId: { $eq: currentUser.documentId },
            },
          },
          {
            // Recordatorios principales donde el usuario es el autor
            type: { $eq: "reminder" },
            authorDocumentId: { $eq: currentUser.documentId },
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
    
    // Filtrar notificaciones duplicadas: excluir notificaciones individuales que tienen parentReminderId en tags
    // Estas son las notificaciones creadas por syncReminderNotifications para usuarios asignados
    // Solo queremos mostrar el recordatorio principal, no las notificaciones individuales
    const filteredNotifications = (data.data || []).filter((notification: any) => {
      // VALIDACIÓN CRÍTICA: Excluir notificaciones individuales de recordatorios
      // Las notificaciones individuales tienen parentReminderId en tags Y recipient
      // Los recordatorios principales NO tienen parentReminderId en tags NI recipient
      if (notification.type === 'reminder') {
        // Si tiene recipient (incluso si es un objeto populado), es una notificación individual
        if (notification.recipient !== undefined && notification.recipient !== null) {
          // Log en desarrollo para depuración
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Excluyendo notificación individual (tiene recipient):', {
              id: notification.id,
              documentId: notification.documentId,
              title: notification.title,
              recipient: notification.recipient,
            });
          }
          return false;
        }
        
        try {
          const tags = typeof notification.tags === 'string' 
            ? JSON.parse(notification.tags) 
            : notification.tags;
          
          // Si tiene parentReminderId (como número, string o cualquier valor truthy), es una notificación individual
          if (tags && (tags.parentReminderId !== undefined && tags.parentReminderId !== null)) {
            // Log en desarrollo para depuración
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 Excluyendo notificación individual (tiene parentReminderId):', {
                id: notification.id,
                documentId: notification.documentId,
                title: notification.title,
                parentReminderId: tags.parentReminderId,
              });
            }
            return false;
          }
        } catch (error) {
          // Si hay error parseando tags, incluir la notificación por seguridad
          console.warn('Error parseando tags de notificación:', error);
        }
      }
      
      // Incluir todas las demás notificaciones
      return true;
    });
    
    return NextResponse.json({ data: filteredNotifications });
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
