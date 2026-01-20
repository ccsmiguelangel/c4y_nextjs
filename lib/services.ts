import qs from "qs";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "./config";
import { formatCurrency } from "./format";
import type {
  ServiceCard,
  ServiceRaw,
  ServiceRawAttributes,
  ServiceCreatePayload,
  ServiceUpdatePayload,
  StrapiResponse,
} from "@/validations/types";

const listQueryString = qs.stringify(
  {
    fields: ["name", "price", "coverage", "description", "category"],
    sort: ["name:asc"],
    pagination: {
      pageSize: 100,
    },
  },
  { encodeValuesOnly: true }
);

const getCoverageLabel = (coverage: string): string => {
  const labels: Record<string, string> = {
    cliente: "Pagado por el cliente",
    empresa: "Cubierto por la empresa",
  };
  return labels[coverage] || coverage;
};

const extractAttributes = (
  entry: ServiceRaw
): ServiceRawAttributes & { id?: number | string; documentId?: string } => {
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
    ...(entry as ServiceRawAttributes),
  };
};

const normalizeService = (entry: ServiceRaw): ServiceCard | null => {
  const attributes = extractAttributes(entry);
  if (!attributes.name) {
    return null;
  }

  const price = Number(attributes.price ?? 0) || 0;
  const isFree = price === 0;
  const idSource = attributes.id ?? attributes.documentId ?? String(Date.now());
  const documentId = attributes.documentId ?? String(idSource);

  return {
    id: String(idSource),
    documentId: String(documentId),
    name: attributes.name,
    price,
    priceLabel: isFree ? "Gratuito" : formatCurrency(price),
    coverage: attributes.coverage || "cliente",
    coverageLabel: getCoverageLabel(attributes.coverage || "cliente"),
    isFree,
    description: attributes.description ?? undefined,
    category: attributes.category ?? undefined,
  };
};

export async function fetchServicesFromStrapi(): Promise<ServiceCard[]> {
  const url = `${STRAPI_BASE_URL}/api/services?${listQueryString}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Strapi Services request failed:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url,
    });
    throw new Error(`Strapi Services request failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as StrapiResponse<ServiceRaw[]>;
  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items
    .map((item) => normalizeService(item))
    .filter((service): service is ServiceCard => Boolean(service));
}

const isNumericId = (value: string | number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === String(value);
};

const buildServiceDetailQuery = (id: string | number) => {
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
      fields: ["name", "price", "coverage", "description", "category"],
      pagination: { pageSize: 1 },
    },
    { encodeValuesOnly: true }
  );
};

export async function fetchServiceByIdFromStrapi(
  id: string | number
): Promise<ServiceCard | null> {
  const detailQuery = buildServiceDetailQuery(id);
  const response = await fetch(`${STRAPI_BASE_URL}/api/services?${detailQuery}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Strapi Service details request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StrapiResponse<ServiceRaw[]>;
  const entry = payload?.data?.[0];
  return entry ? normalizeService(entry) : null;
}

const resolveServiceDocumentId = async (id: string | number) => {
  if (!isNumericId(id)) {
    return String(id);
  }

  const service = await fetchServiceByIdFromStrapi(id);
  return service?.documentId ?? null;
};

export async function createServiceInStrapi(
  data: ServiceCreatePayload
): Promise<ServiceCard> {
  const url = `${STRAPI_BASE_URL}/api/services`;
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
    throw new Error(`Strapi Service create failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as StrapiResponse<ServiceRaw>;
  const service = payload?.data ? normalizeService(payload.data) : null;

  if (!service) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  return service;
}

export async function updateServiceInStrapi(
  id: string | number,
  data: ServiceUpdatePayload
): Promise<ServiceCard> {
  const documentId = await resolveServiceDocumentId(id);

  if (!documentId) {
    throw new Error("No pudimos encontrar el servicio para actualizarlo.");
  }

  const url = `${STRAPI_BASE_URL}/api/services/${documentId}`;
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
    let errorMessage = `Error al actualizar el servicio (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorData?.error || errorMessage;
    } catch {
      // Si falla, usar el mensaje por defecto
    }
    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as StrapiResponse<ServiceRaw>;
  const service = payload?.data ? normalizeService(payload.data) : null;

  if (!service) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  return service;
}

export async function deleteServiceInStrapi(id: string | number): Promise<void> {
  const documentId = await resolveServiceDocumentId(id);

  if (!documentId) {
    throw new Error("No pudimos encontrar el servicio para eliminarlo.");
  }

  const response = await fetch(`${STRAPI_BASE_URL}/api/services/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strapi Service delete failed with status ${response.status}`);
  }
}
