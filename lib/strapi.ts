import qs from "qs";
import { QUERY_DASHBOARD, QUERY_SINGIN, QUERY_SINGUP } from "./strapi-queries";
import { STRAPI_BASE_URL, STRAPI_API_TOKEN } from "./config";
import { strapiImages } from "./strapi-images";
import type { StrapiPageMetadata, StrapiResponse, SinginData, SinginFormData, SinginDataProcessed, SingupData, SingupFormData, SingupDataProcessed, DashboardData, DashboardDataProcessed, HeroSectionData } from "@/validations/types";

export async function getStrapiData(path: string): Promise<StrapiResponse | null> {
  // "use cache";
  try {
    const response = await fetch(`${STRAPI_BASE_URL}/api/${path}`, {
      next: { revalidate: 3600 }, // Cache por 1 hora
    });
    if (!response.ok) {
      // No lanzar error, solo loguear y retornar null
      console.warn(`Strapi API error for ${path}: HTTP ${response.status}`);
      return null;
    }
    const data = await response.json();
    
    return strapiImages.process(data) as StrapiResponse;
  } catch (error) {
    console.error(`Error fetching data from Strapi (${path}):`, error);
    return null;
  }
}

export async function getMetadata(strapiData: Readonly<StrapiPageMetadata> | null) {
  if (!strapiData) return null;
  const { title, description, favicon } = strapiData;
  return {
    title: title || "Default",
    description: description || "Default description",
    icons: {
      icon: favicon?.url || "/favicon.ico",
    },
  };
}

export async function getStrapiPage<T = any>(contentType: string, query?: Record<string, any>): Promise<T | null> {
  const queryString = query ? qs.stringify({ populate: query }) : "";
  const path = queryString ? `${contentType}?${queryString}` : contentType;
  const response = await getStrapiData(path);
  
  return response?.data || null;
} 

export async function registerUserService (userData: object) {
  const url = `${STRAPI_BASE_URL}/api/auth/local/register`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    const data = await response.json()
    
    // Si el registro fue exitoso, actualizar el usuario para establecer confirmed: false
    if (data.user && data.user.id && !data.error) {
      await updateUserConfirmedStatus(data.user.id, false)
    }
    
    console.log(data)
    return data
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

export async function loginUserService(userData: { identifier: string; password: string }) {
  const url = `${STRAPI_BASE_URL}/api/auth/local`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error logging in user:', error)
    throw error
  }
}

/**
 * Actualiza el estado de confirmed de un usuario usando el token de API de Strapi
 * Esta función solo se ejecuta en el servidor y nunca expone el token al cliente
 */
async function updateUserConfirmedStatus(userId: number, confirmed: boolean) {
  if (!STRAPI_API_TOKEN) {
    console.error('STRAPI_API_TOKEN is not set, cannot update user confirmed status')
    return
  }

  try {
    const url = `${STRAPI_BASE_URL}/api/users/${userId}`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      },
      body: JSON.stringify({
        confirmed
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error updating user confirmed status:', errorData)
      return
    }

    const updatedUser = await response.json()
    console.log('User confirmed status updated successfully:', updatedUser)
  } catch (error) {
    console.error('Error updating user confirmed status:', error)
  }
}

export async function getDashboard(): Promise<DashboardDataProcessed | null> {
  const data = await getStrapiPage<DashboardData>("dashboard", QUERY_DASHBOARD.populate);
  if (!data) return null;
  
  // Procesar las secciones de la dynamic zone
  const sections = data.sections
    ?.filter((section) => section.__component === "layout.hero-section")
    .map((section) => {
      const { __component, ...sectionData } = section;
      return sectionData as HeroSectionData;
    }) || [];
  
  return {
    title: data.title,
    description: data.description,
    favicon: data.favicon,
    sections,
  };
}

export async function getSingin(): Promise<SinginDataProcessed | null> {
  const data = await getStrapiPage<SinginData>("singin", QUERY_SINGIN.populate);
  if (!data) return null;
  
  // Encontrar el componente singin-form en la dynamic zone
  const singinForm = data.sections?.find(
    (section) => section.__component === "layout.singin-form"
  ) as SinginFormData | undefined;
  
  if (!singinForm) return null;
  
  return {
    title: data.title,
    description: data.description,
    header: data.header,
    singinForm,
  };
}

export async function getSingup(): Promise<SingupDataProcessed | null> {
  const data = await getStrapiPage<SingupData>("signup", QUERY_SINGUP.populate);
  if (!data) return null;
  
  // Encontrar el componente singup-form en la dynamic zone
  const singupForm = data.sections?.find(
    (section) => section.__component === "layout.singup-form"
  ) as SingupFormData | undefined;
  
  if (!singupForm) return null;
  
  // header es repeatable, tomar el primer elemento
  const header = Array.isArray(data.header) ? data.header[0] : data.header;
  
  return {
    title: data.Title || "",
    description: data.Description || "",
    header: header || { title: "", description: "" },
    singupForm,
  };
}