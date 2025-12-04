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

const populateImageConfig = {
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

const normalizeVehicle = (entry: FleetVehicleRaw): FleetVehicleCard | null => {
  const attributes = extractAttributes(entry);
  if (!attributes.name || !attributes.vin) {
    return null;
  }

  const parsedPrice = Number(attributes.price ?? 0) || 0;
  const imageData = getImageData(attributes.image);
  const imageUrl = imageData?.url ? strapiImages.getURL(imageData.url) : undefined;
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
    throw new Error(`Strapi Fleet request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StrapiResponse<FleetVehicleRaw[]>;
  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items
    .map(normalizeVehicle)
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
      ...populateImageConfig,
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

