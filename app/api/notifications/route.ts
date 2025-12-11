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

    // Obtener notificaciones del usuario
    const notificationQuery = qs.stringify({
      filters: {
        recipient: {
          documentId: { $eq: currentUser.documentId },
        },
      },
      fields: ["id", "documentId", "title", "description", "type", "isRead", "timestamp", "createdAt"],
      populate: {
        recipient: {
          fields: ["id", "documentId", "displayName", "email"],
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
    return NextResponse.json({ data: data.data || [] });
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
