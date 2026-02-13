/**
 * Librería de funciones para Pagos (Billing Records)
 * Pagos individuales vinculados a un Financiamiento
 */

import qs from "qs";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "./config";
import { formatCurrency } from "./format";
import {
  calculateLateFee,
  calculateDaysLate,
  processPayment,
  calculateNextDueDate,
  updateFinancingInStrapi,
  type PaymentStatus,
  type FinancingCard,
  type FinancingStatus,
} from "./financing";

// ============================================================================
// TIPOS
// ============================================================================

export interface BillingRecordRaw {
  id: number;
  documentId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  quotaNumber: number;
  quotasCovered: number;
  quotaAmountCovered?: number;
  advanceCredit: number;
  remainingQuotaBalance: number; // Saldo pendiente de la cuota actual
  lateFeeAmount: number;
  daysLate: number;
  dueDate: string;
  paymentDate?: string;
  confirmationNumber?: string;
  verifiedInBank: boolean;
  verifiedBy?: {
    id: number;
    documentId: string;
    displayName: string;
  };
  verifiedAt?: string;
  comments?: string;
  financing?: {
    id: number;
    documentId: string;
    financingNumber: string;
    quotaAmount: number;
    totalQuotas: number;
    paidQuotas: number;
    currentBalance: number;
    status: string;
    vehicle?: {
      id: number;
      documentId: string;
      name: string;
      placa?: string;
    };
    client?: {
      id: number;
      documentId: string;
      displayName: string;
    };
  };
  documents?: Array<{
    id: number;
    documentId: string;
    name: string;
    file?: {
      url: string;
      mime: string;
    };
  }>;
  createdAt: string;
}

export interface BillingRecordCard {
  id: string;
  documentId: string;
  receiptNumber: string;
  amount: number;
  amountLabel: string;
  currency: string;
  status: PaymentStatus;
  statusLabel: string;
  quotaNumber: number;
  quotasCovered: number;
  quotaAmountCovered?: number;
  advanceCredit: number;
  remainingQuotaBalance: number; // Saldo pendiente de la cuota actual
  lateFeeAmount: number;
  lateFeeAmountLabel: string;
  daysLate: number;
  dueDate: string;
  dueDateLabel: string;
  paymentDate?: string;
  paymentDateLabel?: string;
  confirmationNumber?: string;
  verifiedInBank: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  comments?: string;
  // Financiamiento
  financingId?: string;
  financingDocumentId?: string;
  financingNumber?: string;
  financingQuotaAmount?: number;
  financingTotalQuotas?: number;
  financingPaidQuotas?: number;
  financingCurrentBalance?: number;
  // Vehículo (desde financing)
  vehicleName?: string;
  vehiclePlaca?: string;
  // Cliente (desde financing)
  clientName?: string;
  // Documentos
  documents: Array<{
    id: string;
    documentId: string;
    name: string;
    url?: string;
    mime?: string;
  }>;
  createdAt: string;
}

export interface BillingRecordCreatePayload {
  amount: number;
  currency?: string;
  quotaNumber: number;
  dueDate: string;
  paymentDate?: string;
  confirmationNumber?: string;
  comments?: string;
  financing: string; // documentId del financiamiento
}

export interface BillingRecordUpdatePayload {
  amount?: number;
  status?: PaymentStatus;
  paymentDate?: string;
  confirmationNumber?: string;
  verifiedInBank?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  comments?: string;
}

// ============================================================================
// FUNCIONES DE FORMATEO
// ============================================================================

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

const getStatusLabel = (status: PaymentStatus): string => {
  const labels: Record<PaymentStatus, string> = {
    pagado: "Pagado",
    pendiente: "Pendiente",
    adelanto: "Adelanto",
    retrasado: "Retrasado",
    abonado: "Abonado",
  };
  return labels[status] || status;
};

// ============================================================================
// NORMALIZACIÓN
// ============================================================================

const normalizeBillingRecord = (raw: BillingRecordRaw): BillingRecordCard => {
  const currency = raw.currency || "USD";

  return {
    id: String(raw.id),
    documentId: raw.documentId,
    receiptNumber: raw.receiptNumber,
    amount: raw.amount,
    amountLabel: formatCurrency(raw.amount, { currency }),
    currency,
    status: raw.status,
    statusLabel: getStatusLabel(raw.status),
    quotaNumber: raw.quotaNumber,
    quotasCovered: raw.quotasCovered || 1,
    quotaAmountCovered: raw.quotaAmountCovered,
    advanceCredit: raw.advanceCredit || 0,
    remainingQuotaBalance: raw.remainingQuotaBalance || 0,
    lateFeeAmount: raw.lateFeeAmount || 0,
    lateFeeAmountLabel: formatCurrency(raw.lateFeeAmount || 0, { currency }),
    daysLate: raw.daysLate || 0,
    dueDate: raw.dueDate,
    dueDateLabel: formatDate(raw.dueDate) || "",
    paymentDate: raw.paymentDate,
    paymentDateLabel: formatDate(raw.paymentDate),
    confirmationNumber: raw.confirmationNumber,
    verifiedInBank: raw.verifiedInBank || false,
    verifiedBy: raw.verifiedBy?.displayName,
    verifiedAt: raw.verifiedAt,
    comments: raw.comments,
    // Financiamiento
    financingId: raw.financing ? String(raw.financing.id) : undefined,
    financingDocumentId: raw.financing?.documentId,
    financingNumber: raw.financing?.financingNumber,
    financingQuotaAmount: raw.financing?.quotaAmount,
    financingTotalQuotas: raw.financing?.totalQuotas,
    financingPaidQuotas: raw.financing?.paidQuotas,
    financingCurrentBalance: raw.financing?.currentBalance,
    // Vehículo
    vehicleName: raw.financing?.vehicle?.name,
    vehiclePlaca: raw.financing?.vehicle?.placa,
    // Cliente
    clientName: raw.financing?.client?.displayName,
    // Documentos - Las URLs necesitan el prefijo de Strapi para ser accesibles
    documents: (raw.documents || []).map((doc) => ({
      id: String(doc.id),
      documentId: doc.documentId,
      name: doc.name,
      url: doc.file?.url ? `${STRAPI_BASE_URL}${doc.file.url}` : undefined,
      mime: doc.file?.mime,
    })),
    createdAt: raw.createdAt,
  };
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

const populateConfig = {
  populate: {
    financing: {
      fields: ["id", "documentId", "financingNumber", "quotaAmount", "totalQuotas", "paidQuotas", "currentBalance", "status"],
      populate: {
        vehicle: {
          fields: ["id", "documentId", "name", "placa"],
        },
        client: {
          fields: ["id", "documentId", "displayName"],
        },
      },
    },
    verifiedBy: {
      fields: ["id", "documentId", "displayName"],
    },
    documents: {
      fields: ["id", "documentId", "name"],
      populate: {
        file: {
          fields: ["url", "mime"],
        },
      },
    },
  },
};

/**
 * Obtener todos los pagos
 */
export async function fetchBillingRecordsFromStrapi(): Promise<BillingRecordCard[]> {
  const query = qs.stringify({
    ...populateConfig,
    sort: ["createdAt:desc"],
    pagination: { pageSize: 100 },
  }, { encodeValuesOnly: true });

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records?${query}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error fetching billing records: ${errorText}`);
  }

  const data = await response.json();
  return (data.data || []).map(normalizeBillingRecord);
}

/**
 * Obtener pagos por financiamiento
 * STRATEGIA HÍBRIDA: Intenta obtener via populate, si falla o está vacío, usa fallback
 */
export async function fetchBillingRecordsByFinancingFromStrapi(financingDocumentId: string): Promise<BillingRecordCard[]> {
  // Intentar método 1: Populate desde financing
  const financingQuery = qs.stringify({
    populate: {
      billingRecords: {
        ...populateConfig.populate,
        sort: ["dueDate:asc"],
      },
    },
  }, { encodeValuesOnly: true });

  console.log(`[Billing] Method 1: Fetching financing with records: ${financingDocumentId}`);
  
  const financingResponse = await fetch(
    `${STRAPI_BASE_URL}/api/financings/${financingDocumentId}?${financingQuery}`,
    {
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (financingResponse.ok) {
    const financingData = await financingResponse.json();
    const billingRecords = financingData.data?.billingRecords || [];
    
    console.log(`[Billing] Method 1 result:`, {
      count: billingRecords.length,
      ids: billingRecords.map((r: BillingRecordRaw) => r.documentId),
    });
    
    // Si encontramos registros, usarlos
    if (billingRecords.length > 0) {
      return billingRecords.map((record: BillingRecordRaw) => normalizeBillingRecord(record));
    }
    
    console.log(`[Billing] Method 1 returned empty, trying fallback...`);
  } else {
    console.error(`[Billing] Method 1 failed:`, await financingResponse.text());
  }
  
  // Fallback al método 2: Filtro directo
  return fetchBillingRecordsByFinancingFromStrapiFallback(financingDocumentId);
}

/**
 * Fallback: Obtener pagos por financiamiento usando filtro directo
 * Prueba múltiples formatos de filtro para Strapi 5
 */
async function fetchBillingRecordsByFinancingFromStrapiFallback(financingDocumentId: string): Promise<BillingRecordCard[]> {
  console.log(`[Billing] Method 2 (Fallback): Fetching for financing ${financingDocumentId}`);
  
  // Formato 1: Filtro por documentId anidado (formato Strapi 5)
  const query1 = qs.stringify({
    filters: {
      financing: {
        documentId: {
          $eq: financingDocumentId,
        },
      },
    },
    ...populateConfig,
    sort: ["dueDate:asc"],
    pagination: { pageSize: 100 },
  }, { encodeValuesOnly: true });

  console.log(`[Billing] Trying format 1 (documentId filter)`);
  
  const response1 = await fetch(`${STRAPI_BASE_URL}/api/billing-records?${query1}`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    cache: "no-store",
  });

  if (response1.ok) {
    const data1 = await response1.json();
    console.log(`[Billing] Format 1 result:`, { count: data1.data?.length || 0 });
    
    if (data1.data?.length > 0) {
      return data1.data.map(normalizeBillingRecord);
    }
  }

  // Formato 2: Filtro por ID directo (usando el id numérico si existe)
  console.log(`[Billing] Trying format 2 (id filter)`);
  
  // Primero obtener el financing para conseguir su ID numérico
  const financingResp = await fetch(
    `${STRAPI_BASE_URL}/api/financings/${financingDocumentId}?fields[0]=id`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: "no-store" }
  );
  
  if (financingResp.ok) {
    const financingData = await financingResp.json();
    const numericId = financingData.data?.id;
    
    if (numericId) {
      const query2 = qs.stringify({
        filters: {
          financing: {
            id: {
              $eq: numericId,
            },
          },
        },
        ...populateConfig,
        sort: ["dueDate:asc"],
        pagination: { pageSize: 100 },
      }, { encodeValuesOnly: true });

      const response2 = await fetch(`${STRAPI_BASE_URL}/api/billing-records?${query2}`, {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      });

      if (response2.ok) {
        const data2 = await response2.json();
        console.log(`[Billing] Format 2 result:`, { count: data2.data?.length || 0 });
        
        if (data2.data?.length > 0) {
          return data2.data.map(normalizeBillingRecord);
        }
      }
    }
  }

  // Si todo falla, devolver array vacío
  console.error(`[Billing] All methods failed for financing ${financingDocumentId}`);
  return [];
}

/**
 * Obtener un pago por ID
 */
export async function fetchBillingRecordByIdFromStrapi(documentId: string): Promise<BillingRecordCard | null> {
  const query = qs.stringify(populateConfig, { encodeValuesOnly: true });

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records/${documentId}?${query}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    const errorText = await response.text();
    throw new Error(`Error fetching billing record: ${errorText}`);
  }

  const data = await response.json();
  return data.data ? normalizeBillingRecord(data.data) : null;
}

/**
 * Generar número de recibo único
 */
async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  // Buscar el último recibo del mes
  const query = qs.stringify({
    filters: {
      receiptNumber: {
        $startsWith: `REC-${year}${month}-`,
      },
    },
    sort: ["createdAt:desc"],
    pagination: { limit: 1 },
  }, { encodeValuesOnly: true });

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records?${query}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  let nextNumber = 1;
  if (response.ok) {
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const lastReceipt = data.data[0].receiptNumber;
      const parts = lastReceipt.split("-");
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2], 10) + 1;
      }
    }
  }

  return `REC-${year}${month}-${String(nextNumber).padStart(5, "0")}`;
}

/**
 * Crear un nuevo pago
 */
export async function createBillingRecordInStrapi(
  payload: BillingRecordCreatePayload,
  financing: FinancingCard
): Promise<BillingRecordCard> {
  // Calcular días de atraso y multa si aplica
  const daysLate = calculateDaysLate(payload.dueDate, payload.paymentDate);
  const lateFeeAmount = daysLate > 0 
    ? calculateLateFee(financing.quotaAmount, daysLate, financing.lateFeePercentage)
    : 0;

  // Calcular cuotas cubiertas y crédito usando el crédito parcial acumulado
  const { quotasCovered, advanceCredit, totalApplied, isPartialPayment } = processPayment(
    payload.amount,
    financing.quotaAmount,
    financing.partialPaymentCredit
  );
  
  // Calcular el saldo pendiente de la cuota actual (diferente de advanceCredit)
  // remainingQuotaBalance: lo que falta por pagar de la cuota actual
  // advanceCredit: crédito disponible para cuotas futuras
  const remainingQuotaBalance = isPartialPayment 
    ? Math.max(0, financing.quotaAmount - totalApplied) // Para pagos parciales: cuota - lo aplicado
    : (quotasCovered > 0 && advanceCredit > 0 ? 0 : Math.max(0, financing.quotaAmount - totalApplied));

  // Determinar estado del pago según reglas de negocio:
  // - Adelanto: cuota de la semana actual pagada + pago para futuro
  // - Abonado: pago aplicado a cuotas generadas con saldo pendiente (pago parcial)
  // - Retrasado: pago con días de atraso
  // - Pagado: pago completo de cuota(s) sin atraso
  let status: PaymentStatus;
  
  if (isPartialPayment) {
    // Pago parcial: se aplica a cuota(s) existente(s) con saldo pendiente
    status = "abonado";
  } else if (daysLate > 0) {
    status = "retrasado";
  } else if (quotasCovered > 1 || advanceCredit > 0) {
    // Cubrió más de una cuota o tiene crédito extra = es adelanto
    status = "adelanto";
  } else {
    status = "pagado";
  }

  // Generar número de recibo
  const receiptNumber = await generateReceiptNumber();

  // Para pagos parciales, quotasCovered se envía como 1 (mínimo requerido por Strapi)
  // pero solo actualizamos paidQuotas en el financiamiento cuando realmente se completan cuotas
  const quotasCoveredForStrapi = Math.max(1, quotasCovered);

  const data = {
    receiptNumber,
    amount: payload.amount,
    currency: payload.currency || "USD",
    status,
    quotaNumber: payload.quotaNumber,
    quotasCovered: quotasCoveredForStrapi,
    quotaAmountCovered: isPartialPayment 
      ? payload.amount // Para pagos parciales, el monto cubierto es el pago mismo
      : Math.min(payload.amount, financing.quotaAmount * quotasCovered),
    advanceCredit,
    remainingQuotaBalance,
    lateFeeAmount,
    daysLate,
    dueDate: payload.dueDate,
    paymentDate: payload.paymentDate || new Date().toISOString().split("T")[0],
    confirmationNumber: payload.confirmationNumber,
    comments: payload.comments,
    financing: payload.financing,
  };

  const query = qs.stringify(populateConfig, { encodeValuesOnly: true });

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records?${query}`, {
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
    throw new Error(`Error creating billing record: ${errorText}`);
  }

  const result = await response.json();
  const createdRecord = normalizeBillingRecord(result.data);

  // =========================================================================
  // ACTUALIZAR EL FINANCIAMIENTO PADRE
  // =========================================================================
  
  // Solo incrementar paidQuotas cuando realmente se completan cuotas (no para pagos parciales)
  const newPaidQuotas = financing.paidQuotas + quotasCovered; // quotasCovered es 0 para parciales
  const newTotalPaid = financing.totalPaid + payload.amount;
  const newCurrentBalance = Math.max(0, financing.currentBalance - payload.amount);
  const newPartialPaymentCredit = advanceCredit; // El crédito acumulado para la próxima cuota
  const newTotalLateFees = financing.totalLateFees + lateFeeAmount;
  
  // Calcular próxima fecha de vencimiento
  const newNextDueDate = calculateNextDueDate(
    financing.nextDueDate,
    financing.paymentFrequency,
    quotasCovered
  );
  
  // Determinar nuevo estado del financiamiento
  let newFinancingStatus: FinancingStatus = financing.status as FinancingStatus;
  if (newPaidQuotas >= financing.totalQuotas) {
    newFinancingStatus = "completado";
  } else if (daysLate > 0) {
    newFinancingStatus = "en_mora";
  } else if (financing.status === "en_mora" && daysLate === 0) {
    // Si estaba en mora y ahora pagó a tiempo, vuelve a activo
    newFinancingStatus = "activo";
  }
  
  try {
    // Actualizar el financiamiento
    await updateFinancingInStrapi(financing.documentId, {
      paidQuotas: newPaidQuotas,
      totalPaid: newTotalPaid,
      currentBalance: newCurrentBalance,
      partialPaymentCredit: newPartialPaymentCredit,
      totalLateFees: newTotalLateFees,
      nextDueDate: newNextDueDate,
      status: newFinancingStatus,
    });
  } catch (updateError) {
    console.error("Error updating financing after payment:", updateError);
    // No lanzamos el error para no bloquear la creación del pago
  }

  return createdRecord;
}

/**
 * Actualizar un pago
 */
export async function updateBillingRecordInStrapi(
  documentId: string,
  payload: BillingRecordUpdatePayload
): Promise<BillingRecordCard> {
  const query = qs.stringify(populateConfig, { encodeValuesOnly: true });

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records/${documentId}?${query}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: payload }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error updating billing record: ${errorText}`);
  }

  const result = await response.json();
  return normalizeBillingRecord(result.data);
}

/**
 * Eliminar un pago
 */
export async function deleteBillingRecordFromStrapi(documentId: string): Promise<void> {
  console.log(`[deleteBillingRecordFromStrapi] Iniciando eliminación de: ${documentId}`);
  
  // 1. Primero obtener el registro para saber el financiamiento asociado y el monto
  console.log(`[deleteBillingRecordFromStrapi] Paso 1: Obteniendo registro...`);
  const record = await fetchBillingRecordByIdFromStrapi(documentId);
  
  if (!record) {
    console.error(`[deleteBillingRecordFromStrapi] Registro no encontrado: ${documentId}`);
    throw new Error("Billing record not found: 404");
  }
  
  console.log(`[deleteBillingRecordFromStrapi] Registro encontrado:`, {
    id: record.id,
    documentId: record.documentId,
    financingDocumentId: record.financingDocumentId,
    amount: record.amount,
    status: record.status,
  });

  // 2. Eliminar el registro
  console.log(`[deleteBillingRecordFromStrapi] Paso 2: Eliminando registro en Strapi...`);
  const deleteUrl = `${STRAPI_BASE_URL}/api/billing-records/${documentId}`;
  console.log(`[deleteBillingRecordFromStrapi] URL: ${deleteUrl}`);
  
  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  console.log(`[deleteBillingRecordFromStrapi] Respuesta DELETE:`, {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[deleteBillingRecordFromStrapi] Error en DELETE:`, errorText);
    throw new Error(`Error deleting billing record: ${errorText}`);
  }
  
  console.log(`[deleteBillingRecordFromStrapi] Registro eliminado exitosamente`);

  // 3. Si tiene financiamiento asociado, actualizar el financiamiento padre
  if (record.financingDocumentId) {
    console.log(`[deleteBillingRecordFromStrapi] Paso 3: Actualizando financing ${record.financingDocumentId}...`);
    try {
      // Obtener el financiamiento actual
      const financingUrl = `${STRAPI_BASE_URL}/api/financings/${record.financingDocumentId}?populate=*`;
      console.log(`[deleteBillingRecordFromStrapi] Fetching financing: ${financingUrl}`);
      
      const financingResponse = await fetch(financingUrl, {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      });
      
      console.log(`[deleteBillingRecordFromStrapi] Respuesta financing:`, {
        status: financingResponse.status,
        ok: financingResponse.ok,
      });

      if (financingResponse.ok) {
        const financingData = await financingResponse.json();
        const financing = financingData.data;
        
        console.log(`[deleteBillingRecordFromStrapi] Financing obtenido:`, {
          id: financing?.id,
          documentId: financing?.documentId,
          paidQuotas: financing?.paidQuotas,
          totalPaid: financing?.totalPaid,
          status: financing?.status,
        });

        if (financing) {
          // 3.1 Obtener TODOS los billing-records restantes para este financing
          console.log(`[deleteBillingRecordFromStrapi] Paso 3.1: Obteniendo billing-records restantes...`);
          const remainingRecordsUrl = `${STRAPI_BASE_URL}/api/billing-records?filters[financing][documentId][$eq]=${record.financingDocumentId}&pagination[limit]=100`;
          
          const remainingResponse = await fetch(remainingRecordsUrl, {
            headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
            cache: "no-store",
          });
          
          let remainingRecords: any[] = [];
          if (remainingResponse.ok) {
            const remainingData = await remainingResponse.json();
            remainingRecords = remainingData.data || [];
          }
          
          console.log(`[deleteBillingRecordFromStrapi] Registros restantes: ${remainingRecords.length}`);

          // 3.2 Recalcular valores desde los registros restantes
          console.log(`[deleteBillingRecordFromStrapi] Paso 3.2: Recalculando valores...`);
          
          let newPaidQuotas = 0;
          let newTotalPaid = 0;
          let newTotalLateFees = 0;
          let newPartialPaymentCredit = 0;
          let maxCoveredQuota = 0;

          for (const billingRecord of remainingRecords) {
            const recordData = billingRecord.attributes || billingRecord;
            const status = recordData.status;
            const amount = recordData.amount || 0;
            const quotaNumber = recordData.quotaNumber || 0;
            const quotasCovered = recordData.quotasCovered || 1;
            const lateFeeAmount = recordData.lateFeeAmount || 0;
            
            // Sumar multas de todas las cuotas retrasadas
            if (status === "retrasado") {
              newTotalLateFees += lateFeeAmount;
            }
            
            // Para pagos que cubren cuotas (pagado, abonado, adelanto)
            if (status === "pagado" || status === "abonado" || status === "adelanto") {
              // Acumular monto pagado
              newTotalPaid += amount;
              
              // Calcular cuotas cubiertas
              const endQuota = quotaNumber + quotasCovered - 1;
              maxCoveredQuota = Math.max(maxCoveredQuota, endQuota);
              
              // Calcular crédito disponible desde abonos/adelantos
              if (status === "abonado" || status === "adelanto") {
                // El crédito es el excedente del abono sobre el monto de las cuotas cubiertas
                const quotaAmount = financing.quotaAmount || 0;
                const totalQuotasAmount = quotasCovered * quotaAmount;
                const creditFromThisRecord = Math.max(0, amount - totalQuotasAmount);
                newPartialPaymentCredit += creditFromThisRecord;
                
                console.log(`[deleteBillingRecordFromStrapi] Crédito de ${status}: +${creditFromThisRecord} (monto:${amount} - cuotas:${totalQuotasAmount})`);
              }
            }
          }
          
          // Las paidQuotas son el máximo de cuotas cubiertas
          newPaidQuotas = maxCoveredQuota;
          
          // Calcular balance actual
          const newCurrentBalance = (financing.totalAmount || 0) - newTotalPaid;
          
          // Determinar nuevo estado
          let newStatus = financing.status;
          if (newPaidQuotas >= financing.totalQuotas) {
            newStatus = "completado";
          } else if (newPaidQuotas > 0 || remainingRecords.length > 0) {
            newStatus = "activo";
          } else {
            newStatus = "activo"; // Mantener activo si hay cuotas pendientes
          }
          
          console.log(`[deleteBillingRecordFromStrapi] Valores recalculados:`, {
            newPaidQuotas,
            newTotalPaid,
            newCurrentBalance,
            newTotalLateFees,
            newPartialPaymentCredit,
            newStatus,
            remainingRecords: remainingRecords.length,
          });

          // 3.3 Actualizar el financiamiento con valores recalculados
          console.log(`[deleteBillingRecordFromStrapi] Paso 3.3: Actualizando financing...`);
          await updateFinancingInStrapi(record.financingDocumentId, {
            paidQuotas: newPaidQuotas,
            totalPaid: newTotalPaid,
            currentBalance: newCurrentBalance,
            totalLateFees: newTotalLateFees,
            partialPaymentCredit: newPartialPaymentCredit,
            status: newStatus,
          });
          
          console.log(`[deleteBillingRecordFromStrapi] Financing actualizado exitosamente`);

          // 4. Reorganizar los números de cuota de los pagos restantes
          // NOTA: Temporalmente desactivado para debug - puede estar causando problemas
          // await reorganizeQuotaNumbers(record.financingDocumentId);
        }
      } else {
        const errorText = await financingResponse.text();
        console.error(`[deleteBillingRecordFromStrapi] Error obteniendo financing:`, errorText);
      }
    } catch (updateError) {
      console.error("[deleteBillingRecordFromStrapi] Error updating financing after payment deletion:", updateError);
      // No lanzamos el error para no bloquear la eliminación del pago
    }
  } else {
    console.log(`[deleteBillingRecordFromStrapi] No hay financing asociado`);
  }
  
  console.log(`[deleteBillingRecordFromStrapi] Eliminación completada`);
}

/**
 * Reorganizar los números de cuota después de eliminar un pago
 */
async function reorganizeQuotaNumbers(financingDocumentId: string): Promise<void> {
  // Obtener todos los pagos del financiamiento ordenados por fecha de pago
  // Usar formato de filtro compatible con Strapi 5
  const query = qs.stringify({
    filters: {
      financing: {
        id: {
          $eq: financingDocumentId,
        },
      },
    },
    sort: ["paymentDate:asc", "createdAt:asc"],
    fields: ["documentId", "quotaNumber"],
    pagination: {
      pageSize: 100,
    },
  }, { encodeValuesOnly: true });

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-records?${query}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Error fetching billing records for reorganization");
    return;
  }

  const data = await response.json();
  const records = data.data || [];

  // Actualizar cada pago con su nuevo número de cuota secuencial
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const newQuotaNumber = i + 1;

    // Solo actualizar si el número cambió
    if (record.quotaNumber !== newQuotaNumber) {
      await fetch(`${STRAPI_BASE_URL}/api/billing-records/${record.documentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { quotaNumber: newQuotaNumber } }),
        cache: "no-store",
      });
    }
  }
}

/**
 * Marcar pago como verificado
 */
export async function verifyBillingRecordInStrapi(
  documentId: string,
  verifiedByDocumentId?: string
): Promise<BillingRecordCard> {
  // Solo incluir verifiedBy si es un documentId válido (no placeholder)
  const isValidDocumentId = verifiedByDocumentId && 
    verifiedByDocumentId !== "admin" && 
    verifiedByDocumentId.length > 10;
  
  return updateBillingRecordInStrapi(documentId, {
    verifiedInBank: true,
    ...(isValidDocumentId && { verifiedBy: verifiedByDocumentId }),
    verifiedAt: new Date().toISOString(),
  });
}

// ============================================================================
// FUNCIONES DE DOCUMENTOS DE BILLING
// ============================================================================

export interface BillingDocument {
  id: string;
  documentId: string;
  name: string;
  url?: string;
  createdAt: string;
}

export interface BillingDocumentCreatePayload {
  name: string;
  file: number; // ID del archivo en Strapi
  record: string | number; // documentId del billing record
}

/**
 * Obtener documentos de un billing record
 */
export async function fetchBillingDocumentsByRecordId(
  billingRecordDocumentId: string
): Promise<BillingDocument[]> {
  const query = qs.stringify({
    filters: {
      record: {
        documentId: {
          $eq: billingRecordDocumentId,
        },
      },
    },
    populate: ["file"],
  }, { encodeValuesOnly: true });

  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-documents?${query}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error fetching billing documents: ${errorText}`);
  }

  const data = await response.json();
  return (data.data || []).map((doc: any) => ({
    id: String(doc.id),
    documentId: doc.documentId,
    name: doc.name,
    url: doc.file?.url ? `${STRAPI_BASE_URL}${doc.file.url}` : undefined,
    createdAt: doc.createdAt,
  }));
}

/**
 * Crear un documento de billing
 */
export async function createBillingDocumentInStrapi(
  payload: BillingDocumentCreatePayload
): Promise<BillingDocument> {
  // Crear el documento
  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        name: payload.name,
        file: payload.file,
        record: payload.record,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error creating billing document: ${errorText}`);
  }

  const result = await response.json();
  const createdDoc = result.data;
  
  // Re-obtener el documento con el archivo populado para tener la URL correcta
  const query = qs.stringify({
    populate: ["file"],
  }, { encodeValuesOnly: true });
  
  const fetchResponse = await fetch(
    `${STRAPI_BASE_URL}/api/billing-documents/${createdDoc.documentId}?${query}`,
    {
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  
  if (fetchResponse.ok) {
    const fetchResult = await fetchResponse.json();
    const doc = fetchResult.data;
    return {
      id: String(doc.id),
      documentId: doc.documentId,
      name: doc.name,
      url: doc.file?.url ? `${STRAPI_BASE_URL}${doc.file.url}` : undefined,
      createdAt: doc.createdAt,
    };
  }
  
  // Fallback: devolver sin URL si no se pudo re-obtener
  return {
    id: String(createdDoc.id),
    documentId: createdDoc.documentId,
    name: createdDoc.name,
    url: undefined,
    createdAt: createdDoc.createdAt,
  };
}

/**
 * Eliminar un documento de billing
 */
export async function deleteBillingDocumentFromStrapi(
  documentId: string
): Promise<void> {
  const response = await fetch(`${STRAPI_BASE_URL}/api/billing-documents/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error deleting billing document: ${errorText}`);
  }
}

// Re-exportar tipos y funciones de financing para compatibilidad
export { calculateLateFee, calculateDaysLate, processPayment };
export type { PaymentStatus };
