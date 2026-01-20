import qs from "qs";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "./config";
import { formatCurrency } from "./format";
import type {
  BillingRecordCard,
  BillingRecordRaw,
  BillingRecordRawAttributes,
  BillingRecordCreatePayload,
  BillingRecordUpdatePayload,
  BillingDocumentCreatePayload,
  BillingDocument,
  BillingDocumentRaw,
  BillingDocumentRawAttributes,
  StrapiResponse,
  StrapiImage,
} from "@/validations/types";

// Populate config para obtener relaciones
const populateConfig = {
  populate: {
    client: {
      fields: ["id", "documentId", "fullName", "email", "phone"],
      populate: {
        avatar: {
          fields: ["url", "alternativeText"],
        },
      },
    },
    vehicle: {
      fields: ["id", "documentId", "name"],
    },
    documents: {
      fields: ["id", "documentId", "name"],
      populate: {
        file: true,
      },
    },
  },
};

const listQueryString = qs.stringify(
  {
    fields: ["invoiceNumber", "amount", "currency", "status", "dueDate", "paymentDate", "notes", "remindersSent"],
    ...populateConfig,
    sort: ["dueDate:desc"],
    pagination: {
      pageSize: 100,
    },
  },
  { encodeValuesOnly: true }
);

const formatDate = (dateString?: string): string | undefined => {
  if (!dateString) return undefined;
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return undefined;
  }
};

const extractAttributes = (
  entry: BillingRecordRaw
): BillingRecordRawAttributes & { id?: number | string; documentId?: string } => {
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
    ...(entry as BillingRecordRawAttributes),
  };
};

const extractDocumentAttributes = (
  entry: BillingDocumentRaw
): BillingDocumentRawAttributes & { id?: number | string; documentId?: string } => {
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
    ...(entry as BillingDocumentRawAttributes),
  };
};

const getFileData = (file: BillingDocumentRawAttributes["file"]) => {
  if (!file) return undefined;
  if ("data" in file && file.data) {
    return file.data.attributes ?? undefined;
  }
  return file as { url?: string; name?: string; mime?: string; size?: number };
};

const getClientData = (client: BillingRecordRawAttributes["client"]) => {
  if (!client) return undefined;
  if ("data" in client && client.data) {
    const attrs = client.data.attributes;
    return {
      id: client.data.id,
      documentId: client.data.documentId,
      fullName: attrs?.fullName,
      email: attrs?.email,
      phone: attrs?.phone,
    };
  }
  return client as {
    id?: number;
    documentId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
};

const getVehicleData = (vehicle: BillingRecordRawAttributes["vehicle"]) => {
  if (!vehicle) return undefined;
  if ("data" in vehicle && vehicle.data) {
    const attrs = vehicle.data.attributes;
    return {
      id: vehicle.data.id,
      documentId: vehicle.data.documentId,
      name: attrs?.name,
    };
  }
  return vehicle as {
    id?: number;
    documentId?: string;
    name?: string;
  };
};

const getDocumentsData = (documents: BillingRecordRawAttributes["documents"]): BillingDocument[] => {
  if (!documents) return [];
  
  let docsArray: BillingDocumentRaw[] = [];
  
  if ("data" in documents && Array.isArray(documents.data)) {
    docsArray = documents.data.map((d) => ({
      id: d.id,
      documentId: d.documentId,
      ...(d.attributes || {}),
    })) as BillingDocumentRaw[];
  } else if (Array.isArray(documents)) {
    docsArray = documents;
  }

  return docsArray.map((doc) => {
    const attrs = extractDocumentAttributes(doc);
    const fileData = getFileData(attrs.file);
    return {
      id: String(attrs.id ?? attrs.documentId ?? ""),
      documentId: attrs.documentId,
      name: attrs.name || fileData?.name || "Documento",
      url: fileData?.url,
      mime: fileData?.mime,
      size: fileData?.size,
    };
  });
};

const normalizeBillingRecord = (entry: BillingRecordRaw): BillingRecordCard | null => {
  const attributes = extractAttributes(entry);
  if (!attributes.invoiceNumber) {
    return null;
  }

  const amount = Number(attributes.amount ?? 0) || 0;
  const currency = attributes.currency || "USD";
  const idSource = attributes.id ?? attributes.documentId ?? attributes.invoiceNumber;
  const documentId = attributes.documentId ?? String(idSource);

  const clientData = getClientData(attributes.client);
  const vehicleData = getVehicleData(attributes.vehicle);
  const documentsData = getDocumentsData(attributes.documents);

  return {
    id: String(idSource),
    documentId: String(documentId),
    invoiceNumber: attributes.invoiceNumber,
    amount,
    amountLabel: formatCurrency(amount, { currency, maximumFractionDigits: 2 }),
    currency,
    status: attributes.status || "pendiente",
    dueDate: attributes.dueDate,
    dueDateLabel: formatDate(attributes.dueDate),
    paymentDate: attributes.paymentDate,
    paymentDateLabel: formatDate(attributes.paymentDate),
    notes: attributes.notes,
    remindersSent: attributes.remindersSent ?? 0,
    clientName: clientData?.fullName,
    clientEmail: clientData?.email,
    clientPhone: clientData?.phone,
    clientId: clientData?.id ? String(clientData.id) : undefined,
    clientDocumentId: clientData?.documentId,
    vehicleName: vehicleData?.name,
    vehicleId: vehicleData?.id ? String(vehicleData.id) : undefined,
    vehicleDocumentId: vehicleData?.documentId,
    documents: documentsData,
  };
};

export async function fetchBillingRecordsFromStrapi(): Promise<BillingRecordCard[]> {
  const url = `${STRAPI_BASE_URL}/api/billing-records?${listQueryString}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Strapi Billing request failed:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url,
    });
    throw new Error(`Strapi Billing request failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as StrapiResponse<BillingRecordRaw[]>;
  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items
    .map((item) => normalizeBillingRecord(item))
    .filter((record): record is BillingRecordCard => Boolean(record));
}

const isNumericId = (value: string | number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === String(value);
};

const buildBillingDetailQuery = (id: string | number) => {
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
      fields: ["invoiceNumber", "amount", "currency", "status", "dueDate", "paymentDate", "notes", "remindersSent"],
      ...populateConfig,
      pagination: { pageSize: 1 },
    },
    { encodeValuesOnly: true }
  );
};

export async function fetchBillingRecordByIdFromStrapi(
  id: string | number
): Promise<BillingRecordCard | null> {
  const detailQuery = buildBillingDetailQuery(id);
  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records?${detailQuery}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Strapi Billing details request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StrapiResponse<BillingRecordRaw[]>;
  const entry = payload?.data?.[0];
  return entry ? normalizeBillingRecord(entry) : null;
}

const resolveBillingDocumentId = async (id: string | number) => {
  if (!isNumericId(id)) {
    return String(id);
  }

  const record = await fetchBillingRecordByIdFromStrapi(id);
  return record?.documentId ?? null;
};

export async function createBillingRecordInStrapi(
  data: BillingRecordCreatePayload
): Promise<BillingRecordCard> {
  const populateQueryString = qs.stringify(populateConfig, { encodeValuesOnly: true });
  const url = `${STRAPI_BASE_URL}/api/billing-records?${populateQueryString}`;
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
    throw new Error(`Strapi Billing create failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as StrapiResponse<BillingRecordRaw>;
  const record = payload?.data ? normalizeBillingRecord(payload.data) : null;

  if (!record) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  return record;
}

export async function updateBillingRecordInStrapi(
  id: string | number,
  data: BillingRecordUpdatePayload
): Promise<BillingRecordCard> {
  const documentId = await resolveBillingDocumentId(id);

  if (!documentId) {
    throw new Error("No pudimos encontrar el registro de facturación para actualizarlo.");
  }

  const populateQueryString = qs.stringify(populateConfig, { encodeValuesOnly: true });
  const url = `${STRAPI_BASE_URL}/api/billing-records/${documentId}?${populateQueryString}`;
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
    let errorMessage = `Error al actualizar el registro de facturación (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorData?.error || errorMessage;
    } catch {
      // Si falla, usar el mensaje por defecto
    }
    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as StrapiResponse<BillingRecordRaw>;
  const record = payload?.data ? normalizeBillingRecord(payload.data) : null;

  if (!record) {
    throw new Error("No pudimos normalizar la respuesta de Strapi.");
  }

  return record;
}

export async function deleteBillingRecordInStrapi(id: string | number): Promise<void> {
  const documentId = await resolveBillingDocumentId(id);

  if (!documentId) {
    throw new Error("No pudimos encontrar el registro de facturación para eliminarlo.");
  }

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strapi Billing delete failed with status ${response.status}`);
  }
}

// ============================================
// Billing Documents CRUD
// ============================================

export async function createBillingDocumentInStrapi(
  data: BillingDocumentCreatePayload
): Promise<BillingDocument> {
  const url = `${STRAPI_BASE_URL}/api/billing-documents?populate=file`;
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
    throw new Error(`Strapi Billing Document create failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as StrapiResponse<BillingDocumentRaw>;
  const docData = payload?.data;
  
  if (!docData) {
    throw new Error("No pudimos crear el documento de facturación.");
  }

  const attrs = extractDocumentAttributes(docData);
  const fileData = getFileData(attrs.file);

  return {
    id: String(attrs.id ?? attrs.documentId ?? ""),
    documentId: attrs.documentId,
    name: attrs.name || fileData?.name || "Documento",
    url: fileData?.url,
    mime: fileData?.mime,
    size: fileData?.size,
  };
}

export async function deleteBillingDocumentInStrapi(documentId: string): Promise<void> {
  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-documents/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strapi Billing Document delete failed with status ${response.status}`);
  }
}

export async function fetchBillingDocumentsByRecordId(
  recordId: string | number
): Promise<BillingDocument[]> {
  const record = await fetchBillingRecordByIdFromStrapi(recordId);
  return record?.documents ?? [];
}
