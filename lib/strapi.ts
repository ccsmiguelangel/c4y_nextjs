import qs from "qs";
import { QUERY_DASHBOARD } from "./strapi-queries";
import { STRAPI_BASE_URL } from "./config";
import { strapiImages } from "./strapi-images";
import type { StrapiPageMetadata, StrapiResponse } from "./types";

export async function getStrapiData(path: string): Promise<StrapiResponse | null> {
  try {
    const response = await fetch(`${STRAPI_BASE_URL}/api/${path}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    return strapiImages.process(data) as StrapiResponse;
  } catch (error) {
    console.error("Error fetching data from Strapi:", error);
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

export async function getDashboard() {
  return getStrapiPage("dashboard", QUERY_DASHBOARD.populate);
}