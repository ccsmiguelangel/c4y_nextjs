import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";
import qs from "qs";

// GET - Obtener el user-profile del usuario actual
export async function GET() {
  try {
    const cookieStore = await cookies();
    const jwt = cookieStore.get("jwt")?.value;
    
    if (!jwt) {
      // Limpiar cookies si no hay JWT
      cookieStore.delete('jwt');
      cookieStore.delete('admin-theme');
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Primero obtener el usuario
    const userResponse = await fetch(`${STRAPI_BASE_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("❌ Error obteniendo usuario de Strapi:", {
        status: userResponse.status,
        statusText: userResponse.statusText,
        errorText,
      });
      
      // Si es un error 401 (no autorizado), limpiar cookies
      if (userResponse.status === 401) {
        cookieStore.delete('jwt');
        cookieStore.delete('admin-theme');
      }
      
      return NextResponse.json(
        { 
          error: "No se pudo obtener el usuario",
          details: errorText || `Error ${userResponse.status}: ${userResponse.statusText}`
        },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    
    // En este proyecto, /api/users/me devuelve el usuario directamente: { id, documentId, username, email, ... }
    // No está envuelto en { data: {...}, meta: {} }
    const userId = userData?.id;
    
    if (!userId) {
      console.error("❌ No se pudo obtener el userId de la respuesta:", {
        userData,
        hasId: !!userData?.id,
        topLevelKeys: userData ? Object.keys(userData) : [],
      });
      return NextResponse.json(
        { 
          error: "Usuario no válido",
          details: "La respuesta de Strapi no contiene un ID de usuario válido",
        },
        { status: 400 }
      );
    }
    
    console.log("✅ userId obtenido:", userId);
    console.log("📧 Email del usuario:", userData.email);

    // Buscar el user-profile relacionado usando el email
    // No podemos usar userAccount porque está marcado como private: true
    // Usamos el email que debería coincidir entre admin::user y user-profile
    const profileQuery = qs.stringify({
      filters: {
        email: { $eq: userData.email },
      },
      fields: ["documentId", "role", "displayName", "email"], // Incluimos el rol
    });

    const profileUrl = `${STRAPI_BASE_URL}/api/user-profiles?${profileQuery}`;
    console.log("🔍 Buscando user-profile con query:", profileQuery);
    console.log("🔍 URL completa:", profileUrl);

    const profileResponse = await fetch(profileUrl, {
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      let errorData;
      try {
        errorData = errorText ? JSON.parse(errorText) : null;
      } catch {
        errorData = { raw: errorText };
      }
      
      console.error("❌ Error obteniendo user-profile:", {
        status: profileResponse.status,
        statusText: profileResponse.statusText,
        url: profileUrl,
        errorData,
        errorText: errorText.substring(0, 500),
      });
      return NextResponse.json(
        { 
          error: "No se pudo obtener el user-profile",
          details: errorData?.error?.message || errorText || `Error ${profileResponse.status}`,
        },
        { status: profileResponse.status }
      );
    }

    const profileData = await profileResponse.json();
    let profile = profileData.data?.[0];
    
    // Si no existe el user-profile, crearlo automáticamente
    if (!profile || !profile.documentId) {
      console.log("📝 User-profile no encontrado, creando uno automáticamente...");
      
      // Crear el user-profile con los datos básicos del usuario
      // Usar el username o la parte antes del @ del email como displayName
      // Si el username es un email, extraer solo la parte antes del @
      let displayName = userData.username;
      
      // Si el username es un email o no existe, usar la parte antes del @ del email
      if (!displayName || displayName.includes("@")) {
        const emailPart = userData.email?.split("@")[0];
        if (emailPart) {
          // Capitalizar la primera letra para que se vea mejor
          displayName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
        } else {
          displayName = "Usuario";
        }
      }
      
      const newProfileData = {
        displayName: displayName,
        email: userData.email,
        role: "seller", // Rol por defecto, se puede cambiar después
      };
      
      console.log("📝 Creando user-profile con datos:", {
        displayName,
        email: userData.email,
        role: "seller",
        usernameOriginal: userData.username,
      });
      
      const createProfileResponse = await fetch(
        `${STRAPI_BASE_URL}/api/user-profiles`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: newProfileData }),
          cache: "no-store",
        }
      );
      
      if (!createProfileResponse.ok) {
        const errorText = await createProfileResponse.text();
        console.error("❌ Error creando user-profile:", {
          status: createProfileResponse.status,
          statusText: createProfileResponse.statusText,
          errorText,
        });
        return NextResponse.json(
          { 
            error: "No se pudo crear el user-profile",
            details: `Error al crear el perfil de usuario: ${errorText || createProfileResponse.statusText}`,
          },
          { status: createProfileResponse.status }
        );
      }
      
      const createdProfile = await createProfileResponse.json();
      profile = createdProfile.data;
      
      if (!profile || !profile.documentId) {
        console.error("❌ User-profile creado pero sin documentId:", createdProfile);
        return NextResponse.json(
          { 
            error: "User-profile creado pero sin documentId",
            details: "El perfil se creó pero no se pudo obtener el documentId",
          },
          { status: 500 }
        );
      }
      
      console.log("✅ User-profile creado automáticamente:", {
        documentId: profile.documentId,
        displayName: profile.displayName,
        email: profile.email,
      });
      
      // Obtener el perfil completo con documentId para retornarlo
      const fullProfileQuery = qs.stringify({
        filters: {
          documentId: { $eq: profile.documentId },
        },
        fields: ["documentId", "displayName", "email", "role"],
      });
      
      const fullProfileResponse = await fetch(
        `${STRAPI_BASE_URL}/api/user-profiles?${fullProfileQuery}`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );
      
      if (fullProfileResponse.ok) {
        const fullProfileData = await fullProfileResponse.json();
        if (fullProfileData.data?.[0]) {
          profile = fullProfileData.data[0];
        }
      }
    }

    console.log("✅ User-profile documentId obtenido:", profile.documentId);
    
    // Retornar el documentId y el rol
    return NextResponse.json({ 
      data: { 
        documentId: profile.documentId,
        role: profile.role,
        displayName: profile.displayName,
        email: profile.email,
      } 
    });
  } catch (error) {
    // Mejorar el logging del error para obtener más información
    const errorInfo = error instanceof Error 
      ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
        }
      : {
          error: String(error),
          type: typeof error,
          stringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        };
    
    console.error("❌ Error obteniendo user-profile en el servidor:", {
      ...errorInfo,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      { 
        error: "Error al obtener el user-profile",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}


