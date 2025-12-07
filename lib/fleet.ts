import qs from "qs";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "./config";
import { strapiImages } from "./strapi-images";
import type {
  FleetVehicleCard,
  FleetVehicleImage,
  FleetVehicleRaw,
  FleetVehicleRawAttributes,
  FleetVehicleUpdatePayload,
} from "@/validations/types";
import { formatCurrency } from "./format";
import type { StrapiResponse } from "@/validations/types";

// Para la lista, necesitamos los formats para usar imágenes pequeñas
// En Strapi v4, los formats se obtienen automáticamente cuando populamos la imagen
// pero necesitamos no especificar fields para obtenerlos
const populateImageConfig = {
  populate: {
    image: true, // Obtener todos los campos de la imagen incluyendo formats
  },
};

// Para detalles, usamos la misma configuración pero sin formato pequeño
const populateImageConfigForDetails = {
  populate: {
    image: {
      fields: ["url", "alternativeText"],
    },
  },
};

const populateImageQueryString = qs.stringify(populateImageConfig, { encodeValuesOnly: true });

const listQueryString = qs.stringify(
  {
    fields: ["name", "vin", "price", "condition", "brand", "model", "year", "imageAlt"],
    ...populateImageConfig,
    sort: ["name:asc"],
    pagination: {
      pageSize: 100,
    },
  },
  { encodeValuesOnly: true }
);

type FleetVehicleImageRelation = {
  data?: {
    attributes?: FleetVehicleImage | null;
  } | null;
};

const extractAttributes = (entry: FleetVehicleRaw): FleetVehicleRawAttributes & {
  id?: number | string;
  documentId?: string;
} => {
  if ("attributes" in entry && entry.attributes) {
    return {
      id: entry.id,
      documentId: entry.attributes.documentId ?? entry.documentId,
      ...entry.attributes,
    };
  }

  return {
    id: entry.id,
    documentId: entry.documentId,
    ...(entry as FleetVehicleRawAttributes),
  };
};

const getImageData = (image: FleetVehicleRawAttributes["image"]) => {
  if (!image) return undefined;
  if ("data" in (image as FleetVehicleImageRelation)) {
    return (image as FleetVehicleImageRelation).data?.attributes ?? undefined;
  }
  return image as FleetVehicleImage;
};

const getImageUrl = (imageData: FleetVehicleImage | undefined, useSmallFormat = false): string | undefined => {
  if (!imageData) return undefined;
  
  // Para cards pequeñas, usar formato 'small' si está disponible, sino 'thumbnail', sino la original
  if (useSmallFormat) {
    // Debug: verificar estructura de formats
    if (process.env.NODE_ENV === 'development') {
      console.log('Image data:', {
        hasFormats: !!imageData.formats,
        formatsKeys: imageData.formats ? Object.keys(imageData.formats) : [],
        hasSmall: !!imageData.formats?.small,
        hasThumbnail: !!imageData.formats?.thumbnail,
        useSmallFormat,
      });
    }
    
    if (imageData.formats?.small?.url) {
      const smallUrl = strapiImages.getURL(imageData.formats.small.url);
      if (process.env.NODE_ENV === 'development') {
        console.log('Using small format:', smallUrl);
      }
      return smallUrl;
    }
    if (imageData.formats?.thumbnail?.url) {
      const thumbUrl = strapiImages.getURL(imageData.formats.thumbnail.url);
      if (process.env.NODE_ENV === 'development') {
        console.log('Using thumbnail format:', thumbUrl);
      }
      return thumbUrl;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('No small formats available, using original');
    }
  }
  
  // Para vista completa, usar la imagen original
  return imageData.url ? strapiImages.getURL(imageData.url) : undefined;
};

const normalizeVehicle = (entry: FleetVehicleRaw, useSmallImage = false): FleetVehicleCard | null => {
  const attributes = extractAttributes(entry);
  if (!attributes.name || !attributes.vin) {
    return null;
  }

  const parsedPrice = Number(attributes.price ?? 0) || 0;
  const imageData = getImageData(attributes.image);
  const imageUrl = getImageUrl(imageData, useSmallImage);
  const imageAlt =
    imageData?.alternativeText ?? attributes.imageAlt ?? attributes.name ?? "Vehículo";
  const idSource = attributes.id ?? attributes.documentId ?? attributes.vin;
  const documentId = attributes.documentId ?? String(idSource);

  return {
    id: String(idSource),
    documentId: String(documentId),
    name: attributes.name,
    vin: attributes.vin,
    condition: attributes.condition,
    brand: attributes.brand,
    model: attributes.model,
    year: attributes.year,
    priceNumber: parsedPrice,
    priceLabel: formatCurrency(parsedPrice),
    imageUrl,
    imageAlt,
    color: attributes.color ?? undefined,
    mileage: attributes.mileage ?? undefined,
    fuelType: attributes.fuelType ?? undefined,
    transmission: attributes.transmission ?? undefined,
  };
};

export async function fetchFleetVehiclesFromStrapi(): Promise<FleetVehicleCard[]> {
  const url = `${STRAPI_BASE_URL}/api/fleets?${listQueryString}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Strapi Fleet request failed:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url,
      queryString: listQueryString,
    });
    throw new Error(`Strapi Fleet request failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as StrapiResponse<FleetVehicleRaw[]>;
  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items
    .map((item) => normalizeVehicle(item, true)) // true = usar formato pequeño para cards de lista
    .filter((vehicle): vehicle is FleetVehicleCard => Boolean(vehicle));
}

const isNumericId = (value: string | number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === String(value);
};

const buildFleetDetailQuery = (id: string | number) => {
  const normalizedId = String(id);
  const filters = isNumericId(id)
    ? {
        $or: [
          { id: { $eq: Number(id) } },
          { documentId: { $eq: normalizedId } },
        ],
      }
    : {
        documentId: { $eq: normalizedId },
      };

  return qs.stringify(
    {
      filters,
      ...populateImageConfigForDetails,
      pagination: { pageSize: 1 },
    },
    { encodeValuesOnly: true }
  );
};

export async function fetchFleetVehicleByIdFromStrapi(
  id: string | number
): Promise<FleetVehicleCard | null> {
  const detailQuery = buildFleetDetailQuery(id);
  const response = await fetch(`${STRAPI_BASE_URL}/api/fleets?${detailQuery}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Strapi Fleet details request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StrapiResponse<FleetVehicleRaw[]>;
  const entry = payload?.data?.[0];
  return entry ? normalizeVehicle(entry) : null;
}

export async function fetchFleetVehicleRawFromStrapi(
  id: string | number
): Promise<FleetVehicleRaw | null> {
  const detailQuery = buildFleetDetailQuery(id);
  const response = await fetch(`${STRAPI_BASE_URL}/api/fleets?${detailQuery}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Strapi Fleet details request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StrapiResponse<FleetVehicleRaw[]>;
  return payload?.data?.[0] ?? null;
}

const resolveFleetDocumentId = async (id: string | number) => {
  if (!isNumericId(id)) {
    return String(id);
  }

  const vehicle = await fetchFleetVehicleByIdFromStrapi(id);
  return vehicle?.documentId ?? null;
};

export async function updateFleetVehicleInStrapi(
  id: string | number,
  data: FleetVehicleUpdatePayload
): Promise<FleetVehicleCard> {
  const documentId = await resolveFleetDocumentId(id);

  if (!documentId) {
    throw new Error("No pudimos encontrar el vehículo para actualizarlo.");
  }

  const url = `${STRAPI_BASE_URL}/api/fleets/${documentId}?${populateImageQueryString}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strapi Fleet update failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StrapiResponse<FleetVehicleRaw>;
  const vehicle = payload?.data ? normalizeVehicle(payload.data) : null;
  if (!vehicle) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  return vehicle;
}

export async function deleteFleetVehicleInStrapi(id: string | number): Promise<void> {
  const documentId = await resolveFleetDocumentId(id);

  if (!documentId) {
    throw new Error("No pudimos encontrar el vehículo para eliminarlo.");
  }

  const response = await fetch(`${STRAPI_BASE_URL}/api/fleets/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strapi Fleet delete failed with status ${response.status}`);
  }
}

export interface FleetVehicleCreatePayload {
  name: string;
  vin: string;
  price: number;
  condition: "nuevo" | "usado" | "seminuevo";
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  mileage?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  image?: number | null;
  imageAlt?: string | null;
}

export async function createFleetVehicleInStrapi(
  data: FleetVehicleCreatePayload
): Promise<FleetVehicleCard> {
  const url = `${STRAPI_BASE_URL}/api/fleets?${populateImageQueryString}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Strapi Fleet create failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as StrapiResponse<FleetVehicleRaw>;
  const vehicle = payload?.data ? normalizeVehicle(payload.data) : null;
  if (!vehicle) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  return vehicle;
}

