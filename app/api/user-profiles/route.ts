import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";
import qs from "qs";

// GET - Obtener todos los perfiles de usuario
export async function GET() {
  try {
    const query = qs.stringify({
      fields: ["id", "documentId", "displayName", "email", "phone", "role", "department", "bio", "address", "dateOfBirth", "hireDate", "identificationNumber", "emergencyContactName", "emergencyContactPhone", "linkedin", "workSchedule", "specialties", "driverLicense"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
      },
      sort: ["displayName:asc"],
    });

    const response = await fetch(
      `${STRAPI_BASE_URL}/api/user-profiles?${query}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error obteniendo perfiles de usuario: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ data: data.data || [] });
  } catch (error) {
    console.error("Error obteniendo perfiles de usuario:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo perfil de usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.data) {
      return NextResponse.json(
        { error: "Payload inválido. Envía los campos dentro de data." },
        { status: 400 }
      );
    }

    const { email, password, ...profileData } = body.data;

    // Si hay email y password, crear el usuario en users-permissions primero
    if (email && password) {
      const authResponse = await fetch(`${STRAPI_BASE_URL}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          email,
          password,
        }),
      });

      if (!authResponse.ok) {
        const authError = await authResponse.json().catch(() => ({}));
        throw new Error(`Error creando usuario de autenticación: ${authError.error?.message || authResponse.statusText}`);
      }

      const authData = await authResponse.json();

      // Confirmar el usuario automáticamente
      await fetch(`${STRAPI_BASE_URL}/api/users/${authData.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ confirmed: true }),
      });
    }

    // Crear el user-profile (sin el password original - ya está hasheado en Strapi)
    const profilePayload = {
      ...profileData,
      email,
      // No incluir password aquí - Strapi lo hasheará automáticamente
      password: password ? 'placeholder' : undefined, // Placeholder para que el campo no quede vacío
    };

    const response = await fetch(
      `${STRAPI_BASE_URL}/api/user-profiles`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: profilePayload }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error creando perfil de usuario: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("Error creando perfil de usuario:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
