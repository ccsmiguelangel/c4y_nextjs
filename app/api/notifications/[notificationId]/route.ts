import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";
import qs from "qs";

interface RouteContext {
  params: Promise<{
    notificationId: string;
  }>;
}

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

// PATCH - Marcar notificación como leída/no leída
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { notificationId } = params;
    
    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId es requerido" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUserProfile();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { isRead } = body;

    if (typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: "isRead debe ser un booleano" },
        { status: 400 }
      );
    }

    // Verificar que la notificación pertenece al usuario actual
    const notificationQuery = qs.stringify({
      filters: {
        id: { $eq: notificationId },
        recipient: {
          documentId: { $eq: currentUser.documentId },
        },
      },
      populate: {
        fleetReminder: {
          fields: ["id"],
        },
      },
    });

    const notificationCheckResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications?${notificationQuery}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!notificationCheckResponse.ok) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      );
    }

    const notificationData = await notificationCheckResponse.json();
    const notification = notificationData.data?.[0];

    if (!notification) {
      return NextResponse.json(
        { error: "Notificación no encontrada o no tienes permisos" },
        { status: 404 }
      );
    }

    // Actualizar la notificación
    const updateResponse = await fetch(
      `${STRAPI_BASE_URL}/api/notifications/${notificationId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            isRead,
          },
        }),
        cache: "no-store",
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Error actualizando notificación: ${errorText || updateResponse.statusText}`);
    }

    const updatedNotification = await updateResponse.json();

    // Si la notificación está relacionada con un recordatorio y se marca como leída,
    // sincronizar el estado del recordatorio si es necesario
    if (notification.fleetReminder && isRead) {
      // El backend ya maneja la sincronización automática cuando se actualiza un recordatorio
      // Aquí solo actualizamos la notificación
    }

    return NextResponse.json({ 
      success: true,
      data: updatedNotification.data 
    });
  } catch (error) {
    console.error("Error actualizando notificación:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
