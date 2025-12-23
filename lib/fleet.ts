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

// Para detalles, necesitamos los formats para seleccionar el tamaño óptimo
const populateImageConfigForDetails = {
  populate: {
    image: true, // Obtener todos los campos incluyendo formats para selección óptima
    responsables: {
      fields: ["id", "documentId", "displayName", "email"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
      },
    },
    assignedDrivers: {
      fields: ["id", "documentId", "displayName", "email"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
      },
    },
    interestedDrivers: {
      fields: ["id", "documentId", "displayName", "email"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
      },
    },
    currentDrivers: {
      fields: ["id", "documentId", "displayName", "email"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
      },
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

type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

const getImageUrl = (
  imageData: FleetVehicleImage | undefined, 
  size: ImageSize | 'small' | boolean = 'original'
): string | undefined => {
  if (!imageData) return undefined;
  
  // Compatibilidad con el parámetro booleano anterior
  const requestedSize: ImageSize = typeof size === 'boolean' 
    ? (size ? 'small' : 'original')
    : size;
  
  // Para cards pequeñas, usar formato 'small' si está disponible, sino 'thumbnail', sino la original
  if (requestedSize === 'small' || requestedSize === 'thumbnail') {
    if (requestedSize === 'small' && imageData.formats?.small?.url) {
      return strapiImages.getURL(imageData.formats.small.url);
    }
    if (imageData.formats?.thumbnail?.url) {
      return strapiImages.getURL(imageData.formats.thumbnail.url);
    }
  }
  
  // Para imágenes medianas (como en listas)
  if (requestedSize === 'medium' && imageData.formats?.medium?.url) {
    return strapiImages.getURL(imageData.formats.medium.url);
  }
  
  // Para imágenes grandes (como en headers), preferir large, luego medium, luego original
  if (requestedSize === 'large') {
    if (imageData.formats?.large?.url) {
      return strapiImages.getURL(imageData.formats.large.url);
    }
    if (imageData.formats?.medium?.url) {
      return strapiImages.getURL(imageData.formats.medium.url);
    }
  }
  
  // Para vista completa o si no hay formato específico, usar la imagen original
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
  
  // Incluir datos completos de la imagen con formats para uso optimizado
  const fullImageData = imageData ? {
    url: imageData.url,
    alternativeText: imageData.alternativeText,
    formats: imageData.formats,
  } : undefined;

  // Helper para obtener avatar
  const getAvatarData = (avatar: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null } | undefined) => {
    if (!avatar) return undefined;
    if ("data" in (avatar as FleetVehicleImageRelation)) {
      return (avatar as FleetVehicleImageRelation).data?.attributes ?? undefined;
    }
    return avatar as FleetVehicleImage;
  };

  // Normalizar assignedDrivers
  // En Strapi v4, las relaciones manyToMany pueden venir como { data: [...] } o directamente como array
  const assignedDriversRaw = attributes.assignedDrivers as any;
  const assignedDriversData = assignedDriversRaw?.data || (Array.isArray(assignedDriversRaw) ? assignedDriversRaw : []);
  const assignedDrivers = assignedDriversData.map((driver: any) => {
    // El driver puede venir con attributes o directamente con los campos
    const driverAttrs = driver.attributes || driver;
    const avatarData = getAvatarData(driverAttrs?.avatar);
    return {
      id: driver.id || driverAttrs?.id,
      documentId: driver.documentId || driverAttrs?.documentId,
      displayName: driverAttrs?.displayName,
      email: driverAttrs?.email,
      avatar: avatarData ? {
        url: avatarData.url,
        alternativeText: avatarData.alternativeText,
      } : undefined,
    };
  });

  // Normalizar responsables
  const responsablesRaw = attributes.responsables as any;
  const responsablesData = responsablesRaw?.data || (Array.isArray(responsablesRaw) ? responsablesRaw : []);
  const responsables = responsablesData.map((resp: any) => {
    // El resp puede venir con attributes o directamente con los campos
    const respAttrs = resp.attributes || resp;
    const avatarData = getAvatarData(respAttrs?.avatar);
    return {
      id: resp.id || respAttrs?.id,
      documentId: resp.documentId || respAttrs?.documentId,
      displayName: respAttrs?.displayName,
      email: respAttrs?.email,
      avatar: avatarData ? {
        url: avatarData.url,
        alternativeText: avatarData.alternativeText,
      } : undefined,
    };
  });

  // Normalizar interestedDrivers (conductores interesados)
  const interestedDriversRaw = attributes.interestedDrivers as any;
  const interestedDriversData = interestedDriversRaw?.data || (Array.isArray(interestedDriversRaw) ? interestedDriversRaw : []);
  const interestedDrivers = interestedDriversData.map((driver: any) => {
    // El driver puede venir con attributes o directamente con los campos
    const driverAttrs = driver.attributes || driver;
    const avatarData = getAvatarData(driverAttrs?.avatar);
    return {
      id: driver.id || driverAttrs?.id,
      documentId: driver.documentId || driverAttrs?.documentId,
      displayName: driverAttrs?.displayName,
      email: driverAttrs?.email,
      avatar: avatarData ? {
        url: avatarData.url,
        alternativeText: avatarData.alternativeText,
      } : undefined,
    };
  });

  // Normalizar currentDrivers (conductores actuales)
  const currentDriversRaw = attributes.currentDrivers as any;
  const currentDriversData = currentDriversRaw?.data || (Array.isArray(currentDriversRaw) ? currentDriversRaw : []);
  const currentDrivers = currentDriversData.map((driver: any) => {
    // El driver puede venir con attributes o directamente con los campos
    const driverAttrs = driver.attributes || driver;
    const avatarData = getAvatarData(driverAttrs?.avatar);
    return {
      id: driver.id || driverAttrs?.id,
      documentId: driver.documentId || driverAttrs?.documentId,
      displayName: driverAttrs?.displayName,
      email: driverAttrs?.email,
      avatar: avatarData ? {
        url: avatarData.url,
        alternativeText: avatarData.alternativeText,
      } : undefined,
    };
  });

  // Normalizar interestedPersons (personas interesadas)
  const interestedPersonsRaw = attributes.interestedPersons as any;
  const interestedPersonsData = interestedPersonsRaw?.data || (Array.isArray(interestedPersonsRaw) ? interestedPersonsRaw : []);
  const interestedPersons = interestedPersonsData.map((person: any) => {
    // La persona puede venir con attributes o directamente con los campos
    const personAttrs = person.attributes || person;
    const avatarData = getAvatarData(personAttrs?.avatar);
    return {
      id: person.id || personAttrs?.id,
      documentId: person.documentId || personAttrs?.documentId,
      fullName: personAttrs?.fullName,
      email: personAttrs?.email,
      phone: personAttrs?.phone,
      status: personAttrs?.status,
      avatar: avatarData ? {
        url: avatarData.url,
        alternativeText: avatarData.alternativeText,
      } : undefined,
    };
  });

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
    imageData: fullImageData,
    color: attributes.color ?? undefined,
    mileage: attributes.mileage ?? undefined,
    fuelType: attributes.fuelType ?? undefined,
    transmission: attributes.transmission ?? undefined,
    nextMaintenanceDate: attributes.nextMaintenanceDate,
    placa: attributes.placa ?? undefined,
    assignedDrivers: assignedDrivers,
    responsables: responsables,
    interestedDrivers: interestedDrivers,
    currentDrivers: currentDrivers,
    interestedPersons: interestedPersons,
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
      fields: ["name", "vin", "price", "condition", "brand", "model", "year", "color", "mileage", "fuelType", "transmission", "imageAlt", "nextMaintenanceDate", "placa"],
      populate: {
        ...populateImageConfigForDetails.populate,
        interestedPersons: {
          fields: ["id", "documentId", "fullName", "email", "phone", "status"],
          populate: {
            avatar: {
              fields: ["url", "alternativeText"],
            },
          },
        },
      },
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

  // Preparar el payload para Strapi
  // Para relaciones manyToMany, Strapi espera arrays de IDs
  const strapiData: any = { ...data };
  
  // IMPORTANTE: No incluir responsables, assignedDrivers e interestedDrivers si no están explícitamente
  // en los datos a actualizar. Si están undefined, NO enviarlos para evitar limpiar las relaciones existentes.
  // Solo enviar estos campos si están presentes en el objeto data (incluso si es un array vacío para limpiar explícitamente).
  // Si no están presentes, Strapi mantendrá los valores existentes.

  if (process.env.NODE_ENV === 'development') {
    console.log("📤 Enviando a Strapi:", {
      responsables: strapiData.responsables,
      assignedDrivers: strapiData.assignedDrivers,
      interestedDrivers: strapiData.interestedDrivers,
    });
  }

  // Usar populateImageConfigForDetails para incluir todas las relaciones
  // Necesitamos construir el query con populate correctamente
  const populateQuery = {
    populate: {
      ...populateImageConfigForDetails.populate,
      interestedPersons: {
        fields: ["id", "documentId", "fullName", "email", "phone", "status"],
        populate: {
          avatar: {
            fields: ["url", "alternativeText"],
          },
        },
      },
    },
  };
  const populateQueryString = qs.stringify(populateQuery, { encodeValuesOnly: true });
  const url = `${STRAPI_BASE_URL}/api/fleets/${documentId}?${populateQueryString}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log("🔗 URL de actualización:", url);
    console.log("📋 Query string:", populateQueryString);
  }
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: strapiData }),
    cache: "no-store",
  });

  if (!response.ok) {
    let errorMessage = `Error al actualizar el vehículo (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorData?.error || errorMessage;
    } catch {
      // Si no se puede parsear el JSON, intentar leer como texto
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Si falla todo, usar el mensaje por defecto
      }
    }
    console.error("❌ Error en Strapi update:", response.status, errorMessage);
    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as StrapiResponse<FleetVehicleRaw>;
  
  if (process.env.NODE_ENV === 'development') {
    const rawData = payload?.data;
    if (rawData) {
      const attrs = extractAttributes(rawData);
      console.log("📥 Respuesta de Strapi después de actualizar:", {
        hasData: !!payload?.data,
        hasAssignedDrivers: !!attrs?.assignedDrivers,
        hasResponsables: !!attrs?.responsables,
        hasInterestedDrivers: !!attrs?.interestedDrivers,
        assignedDriversType: typeof attrs?.assignedDrivers,
        assignedDriversIsArray: Array.isArray(attrs?.assignedDrivers),
        assignedDriversRaw: attrs?.assignedDrivers,
        responsablesRaw: attrs?.responsables,
        interestedDriversRaw: attrs?.interestedDrivers,
        nextMaintenanceDate: attrs?.nextMaintenanceDate,
      });
    }
  }
  
  const vehicle = payload?.data ? normalizeVehicle(payload.data) : null;
  if (!vehicle) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  if (process.env.NODE_ENV === 'development') {
    console.log("✅ Vehículo normalizado después de actualizar:", {
      assignedDrivers: vehicle.assignedDrivers,
      responsables: vehicle.responsables,
      interestedDrivers: vehicle.interestedDrivers,
      nextMaintenanceDate: vehicle.nextMaintenanceDate,
    });
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
  responsables?: number[];
  assignedDrivers?: number[];
  nextMaintenanceDate?: string | null;
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
  
  if (process.env.NODE_ENV === 'development') {
    const rawData = payload?.data;
    if (rawData) {
      const attrs = extractAttributes(rawData);
      console.log("📥 Respuesta de Strapi después de actualizar:", {
        hasData: !!payload?.data,
        hasAssignedDrivers: !!attrs?.assignedDrivers,
        hasResponsables: !!attrs?.responsables,
        assignedDriversType: typeof attrs?.assignedDrivers,
        assignedDriversIsArray: Array.isArray(attrs?.assignedDrivers),
        assignedDriversRaw: attrs?.assignedDrivers,
        responsablesRaw: attrs?.responsables,
        stockQuantity: attrs?.stockQuantity,
      });
    }
  }
  
  const vehicle = payload?.data ? normalizeVehicle(payload.data) : null;
  if (!vehicle) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  if (process.env.NODE_ENV === 'development') {
    console.log("✅ Vehículo normalizado:", {
      assignedDrivers: vehicle.assignedDrivers,
      responsables: vehicle.responsables,
    });
  }

  return vehicle;
}

