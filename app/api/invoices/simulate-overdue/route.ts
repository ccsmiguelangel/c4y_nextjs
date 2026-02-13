import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

// Función auxiliar: Calcula el mapa de cuotas cubiertas por financing
async function getCoveredQuotasMap(financingIds: number[]): Promise<Map<number, Set<number>>> {
  const coveredMap = new Map<number, Set<number>>();
  
  if (financingIds.length === 0) return coveredMap;
  
  try {
    // Obtener todos los billing-records de los financiamientos en una sola query
    const idsFilter = financingIds.join(',');
    const response = await fetch(
      `${STRAPI_BASE_URL}/api/billing-records?filters[financing][id][$in]=${idsFilter}&fields[0]=quotaNumber&fields[1]=status&fields[2]=quotasCovered&fields[3]=financing&pagination[limit]=1000`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );
    
    if (!response.ok) {
      console.error('[getCoveredQuotasMap] Error fetching records:', await response.text());
      return coveredMap;
    }
    
    const data = await response.json();
    const records = data.data || [];
    
    console.log(`[getCoveredQuotasMap] Encontrados ${records.length} records para financingIds: [${idsFilter}]`);
    
    for (const record of records) {
      // Manejar formato Strapi v4 (attributes) o formato plano
      const recordData = record.attributes || record;
      const financingData = recordData.financing?.data || recordData.financing || record.financing;
      const financingId = financingData?.id || financingData;
      
      if (!financingId) {
        console.log(`[getCoveredQuotasMap] Record sin financingId:`, recordData);
        continue;
      }
      
      const financingIdNum = typeof financingId === 'string' ? parseInt(financingId) : financingId;
      
      if (!coveredMap.has(financingIdNum)) {
        coveredMap.set(financingIdNum, new Set<number>());
      }
      
      const coveredSet = coveredMap.get(financingIdNum)!;
      const quotaNumber = recordData.quotaNumber;
      const status = recordData.status;
      const quotasCovered = recordData.quotasCovered;
      
      if (status === "pagado" && quotaNumber) {
        // Cuota pagada individualmente
        coveredSet.add(quotaNumber);
        console.log(`[getCoveredQuotasMap] F${financingIdNum} Cuota #${quotaNumber} pagada`);
      } else if ((status === "abonado" || status === "adelanto") && quotaNumber) {
        // Abono/adelanto cubre un rango de cuotas
        const coveredCount = quotasCovered || 1;
        for (let i = 0; i < coveredCount; i++) {
          coveredSet.add(quotaNumber + i);
        }
        console.log(`[getCoveredQuotasMap] F${financingIdNum} Cuotas #${quotaNumber}-${quotaNumber + coveredCount - 1} ${status}`);
      }
    }
    
    return coveredMap;
  } catch (error) {
    console.error('[getCoveredQuotasMap] Error:', error);
    return coveredMap;
  }
}

// Función auxiliar: Verifica si una cuota está cubierta
function isQuotaCovered(coveredMap: Map<number, Set<number>>, financingId: number, quotaNumber: number): boolean {
  // Buscar el financingId directamente
  let coveredSet = coveredMap.get(financingId);
  
  // Si no se encuentra, intentar buscar como string
  if (!coveredSet) {
    coveredSet = coveredMap.get(financingId as any);
  }
  
  if (!coveredSet) {
    console.log(`[isQuotaCovered] No hay datos de cuotas cubiertas para F${financingId}`);
    return false;
  }
  
  const isCovered = coveredSet.has(quotaNumber);
  console.log(`[isQuotaCovered] F${financingId} quota #${quotaNumber}: ${isCovered ? 'CUBIERTA' : 'NO cubierta'} (set: [${Array.from(coveredSet).join(',')}])`);
  return isCovered;
}

// POST - Simular vencimiento de facturas
// Modo normal (viernes): marca pendientes como retrasadas + actualiza existentes
// Modo update-existing (martes): solo actualiza cuotas ya retrasadas
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { simulationDate = new Date().toISOString().split('T')[0], mode = "normal" } = body;

    // Obtener configuración de penalidad
    const configResponse = await fetch(
      `${STRAPI_BASE_URL}/api/configurations`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );
    
    const configData = await configResponse.json();
    const configs = configData.data || [];
    const penaltyConfig = configs.find((c: { key?: string; value?: string }) => c.key === "billing-penalty-percentage");
    const penaltyPercentage = penaltyConfig?.value ? parseFloat(penaltyConfig.value) : 10;

    // Modo "update-existing": solo actualizar cuotas ya retrasadas (para Simular Martes)
    // Modo "normal": marcar pendientes como retrasadas + actualizar existentes (para Simular Viernes)
    
    let pendingInvoices: any[] = [];
    let existingOverdue: any[] = [];
    
    if (mode === "normal") {
      // Buscar CUOTAS PENDIENTES para marcarlas como retrasadas
      // populate[financing] para obtener el financingId
      const pendingQueryUrl = `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=pendiente&filters[dueDate][$lte]=${simulationDate}&populate[financing]=true`;
      
      const pendingResponse = await fetch(pendingQueryUrl, {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      });

      if (!pendingResponse.ok) {
        throw new Error("Error obteniendo cuotas pendientes");
      }

      const pendingData = await pendingResponse.json();
      pendingInvoices = pendingData.data || [];
      console.log(`[SimulateOverdue] Pendientes encontrados: ${pendingInvoices.length}`);
      if (pendingInvoices.length > 0) {
        console.log(`[SimulateOverdue] Primer pendiente:`, JSON.stringify(pendingInvoices[0], null, 2));
      }
    }
    
    // Buscar CUOTAS YA RETRASADAS para recalcular multas (siempre, en ambos modos)
    const overdueQueryUrl = `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=retrasado&filters[dueDate][$lte]=${simulationDate}&populate[financing]=true`;
    
    const overdueResponse = await fetch(overdueQueryUrl, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: "no-store",
    });

    const overdueData = overdueResponse.ok ? await overdueResponse.json() : { data: [] };
    existingOverdue = overdueData.data || [];
    console.log(`[SimulateOverdue] Retrasadas encontradas: ${existingOverdue.length}`);
    if (existingOverdue.length > 0) {
      console.log(`[SimulateOverdue] Primera retrasada:`, JSON.stringify(existingOverdue[0], null, 2));
    }

    // Combinar resultados
    let invoices: any[] = [...pendingInvoices, ...existingOverdue];
    console.log(`[SimulateOverdue] Total invoices a procesar: ${invoices.length}`);
    if (!Array.isArray(invoices)) {
      invoices = [];
    }

    // Obtener todos los financingIds únicos para calcular cuotas cubiertas de una vez
    const financingIds = new Set<number>();
    for (const invoice of invoices) {
      // Strapi v4 format: invoice.attributes.financing.data.id
      // o formato plano: invoice.financing.id
      const invoiceData = invoice.attributes || invoice;
      
      console.log(`[SimulateOverdue] Analizando invoice:`, {
        id: invoice.id,
        quotaNumber: invoiceData.quotaNumber,
        status: invoiceData.status,
        financing: invoiceData.financing
      });
      
      // Intentar múltiples formatos de Strapi
      let financingId = null;
      
      if (invoiceData.financing?.data?.id) {
        // Strapi v4 populate format
        financingId = invoiceData.financing.data.id;
      } else if (invoiceData.financing?.id) {
        // Relación directa
        financingId = invoiceData.financing.id;
      } else if (invoiceData.financingId) {
        // Campo plano
        financingId = invoiceData.financingId;
      } else if (typeof invoiceData.financing === 'number') {
        // ID directo
        financingId = invoiceData.financing;
      } else if (typeof invoiceData.financing === 'string') {
        // ID como string
        financingId = parseInt(invoiceData.financing);
      }
      
      if (financingId) {
        const financingIdNum = typeof financingId === 'string' ? parseInt(financingId) : financingId;
        financingIds.add(financingIdNum);
        console.log(`[SimulateOverdue]   → FinancingId extraído: ${financingIdNum}`);
      } else {
        console.log(`[SimulateOverdue]   → No se pudo extraer financingId`);
      }
    }
    
    console.log(`[SimulateOverdue] FinancingIds encontrados: [${Array.from(financingIds).join(',')}]`);
    
    // Calcular mapa de cuotas cubiertas por financing (una sola llamada)
    const coveredQuotasMap = await getCoveredQuotasMap(Array.from(financingIds));
    
    // Log detallado del mapa
    console.log(`[SimulateOverdue] Mapa de cuotas cubiertas:`);
    for (const [id, set] of coveredQuotasMap.entries()) {
      const quotas = Array.from(set).sort((a, b) => a - b);
      console.log(`  F${id}: [${quotas.join(',')}]`);
    }

    const updatedInvoices = [];
    let totalPenaltyAmount = 0;

    for (const invoice of invoices) {
      const invoiceData = invoice.attributes || invoice;
      
      // Verificar nuevamente que no esté pagada (doble verificación)
      if (invoiceData.status === "pagado" || invoiceData.status === "adelanto") {
        continue;
      }
      
      // Obtener el financingId asociado al record (múltiples formatos)
      let financingId = null;
      if (invoiceData.financing?.data?.id) {
        financingId = invoiceData.financing.data.id;
      } else if (invoiceData.financing?.id) {
        financingId = invoiceData.financing.id;
      } else if (invoiceData.financingId) {
        financingId = invoiceData.financingId;
      } else if (typeof invoiceData.financing === 'number') {
        financingId = invoiceData.financing;
      } else if (typeof invoiceData.financing === 'string') {
        financingId = parseInt(invoiceData.financing);
      }
      
      const quotaNumber = invoiceData.quotaNumber;
      
      console.log(`[SimulateOverdue] Procesando record: quotaNumber=${quotaNumber}, status=${invoiceData.status}, financingId=${financingId}`);
      
      // Si hay financing y quotaNumber, verificar si está cubierta por abono
      if (financingId && quotaNumber) {
        const financingIdNum = typeof financingId === 'string' ? parseInt(financingId) : financingId;
        const isCovered = isQuotaCovered(coveredQuotasMap, financingIdNum, quotaNumber);
        console.log(`[SimulateOverdue]   Verificando F${financingIdNum} quota #${quotaNumber}: cubierta=${isCovered}`);
        if (isCovered) {
          console.log(`[SimulateOverdue]   → SKIPPED: Cuota #${quotaNumber} de financing ${financingIdNum} está cubierta por abono/adelanto`);
          continue; // No marcar como retrasado si está cubierta
        }
      } else {
        console.log(`[SimulateOverdue]   → No se pudo verificar: financingId=${financingId}, quotaNumber=${quotaNumber}`);
      }

      const amount = parseFloat(invoiceData.amount) || 0;
      
      // Calcular días de vencimiento (días naturales DESPUÉS del dueDate)
      // dueDate = jueves, simulationDate = viernes → 1 día de atraso
      const dueParts = invoiceData.dueDate.split('-').map(Number);
      const simParts = simulationDate.split('-').map(Number);
      
      // Crear fechas en UTC para evitar problemas de timezone
      const dueDate = Date.UTC(dueParts[0], dueParts[1] - 1, dueParts[2]);
      const simDate = Date.UTC(simParts[0], simParts[1] - 1, simParts[2]);
      
      // Diferencia en días completos
      const msPerDay = 24 * 60 * 60 * 1000;
      const rawDaysOverdue = Math.round((simDate - dueDate) / msPerDay);
      
      // Mínimo 1 día de retraso si ya está vencida
      const daysOverdue = Math.max(1, rawDaysOverdue);
      
      // Penalidad: 10% por día de retraso (acumulativo)
      // Ejemplo: $225 × 10% × 2 días = $45.00
      const penaltyPerDay = (amount * penaltyPercentage) / 100;
      const penaltyAmount = penaltyPerDay * daysOverdue;
      const totalWithPenalty = amount + penaltyAmount;

      const recordId = invoice.documentId || invoiceData.documentId || invoice.id;

      // Determinar si debemos cambiar el status
      // En modo "normal", marcar pendientes como retrasado
      // En modo "update-existing", mantener el status existente (ya está retrasado)
      const newStatus = (mode === "normal" && invoiceData.status === "pendiente") 
        ? "retrasado" 
        : invoiceData.status;

      // Actualizar cuota con penalidad (y nuevo status si aplica)
      const updateResponse = await fetch(
        `${STRAPI_BASE_URL}/api/billing-records/${recordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              status: newStatus,
              lateFeeAmount: penaltyAmount,
              daysLate: daysOverdue,
            },
          }),
          cache: "no-store",
        }
      );
      
      if (!updateResponse.ok) {
        continue;
      }

      updatedInvoices.push({
        id: invoice.id,
        documentId: invoice.documentId,
        receiptNumber: invoiceData.receiptNumber,
        financingId: invoiceData.financing?.id || invoiceData.financing?.data?.id,
        amount: amount,
        penaltyPerDay: penaltyPerDay,
        daysOverdue: daysOverdue,
        penaltyAmount: penaltyAmount,
        totalWithPenalty: totalWithPenalty,
        dueDate: invoiceData.dueDate,
        quotaNumber: invoiceData.quotaNumber,
      });
      totalPenaltyAmount += penaltyAmount;
    }

    return NextResponse.json({
      success: true,
      overdueCount: updatedInvoices.length,
      totalPenaltyAmount,
      simulationDate,
      penaltyPercentage,
      invoices: updatedInvoices,
    });
  } catch (error) {
    console.error("[Simulate Overdue] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

// GET - Solo consultar cuotas vencidas sin actualizar
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const simulationDate = searchParams.get('simulationDate') || new Date().toISOString().split('T')[0];

    // Obtener configuración de penalidad
    const configResponse = await fetch(
      `${STRAPI_BASE_URL}/api/configurations`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );
    
    const configData = await configResponse.json();
    const configs = configData.data || [];
    const penaltyConfig = configs.find((c: { key?: string; value?: string }) => c.key === "billing-penalty-percentage");
    const penaltyPercentage = penaltyConfig?.value ? parseFloat(penaltyConfig.value) : 10;

    // Buscar cuotas pendientes que estarían vencidas
    const pendingResponse = await fetch(
      `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=pendiente&filters[dueDate][$lt]=${simulationDate}&populate[financing]=true`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!pendingResponse.ok) {
      throw new Error("Error obteniendo cuotas");
    }

    const pendingData = await pendingResponse.json();
    
    // Buscar cuotas ya retrasadas
    const overdueResponse = await fetch(
      `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=retrasado&filters[dueDate][$lt]=${simulationDate}&populate[financing]=true`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );
    
    const overdueData = overdueResponse.ok ? await overdueResponse.json() : { data: [] };

    // Combinar resultados
    const invoices = [...(pendingData.data || []), ...(overdueData.data || [])];

    // Obtener todos los financingIds únicos
    const financingIds = new Set<number>();
    for (const invoice of invoices) {
      const invoiceData = invoice.attributes || invoice;
      let financingId = null;
      if (invoiceData.financing?.data?.id) {
        financingId = invoiceData.financing.data.id;
      } else if (invoiceData.financing?.id) {
        financingId = invoiceData.financing.id;
      } else if (invoiceData.financingId) {
        financingId = invoiceData.financingId;
      } else if (typeof invoiceData.financing === 'number') {
        financingId = invoiceData.financing;
      } else if (typeof invoiceData.financing === 'string') {
        financingId = parseInt(invoiceData.financing);
      }
      if (financingId) {
        const financingIdNum = typeof financingId === 'string' ? parseInt(financingId) : financingId;
        financingIds.add(financingIdNum);
      }
    }
    
    // Calcular mapa de cuotas cubiertas por financing
    const coveredQuotasMap = await getCoveredQuotasMap(Array.from(financingIds));

    const overdueInvoices = [];
    let totalPenaltyAmount = 0;

    for (const invoice of invoices) {
      const invoiceData = invoice.attributes || invoice;
      
      // Excluir pagadas
      if (invoiceData.status === "pagado" || invoiceData.status === "adelanto") {
        continue;
      }
      
      // Obtener el financingId y quotaNumber
      let financingId = null;
      if (invoiceData.financing?.data?.id) {
        financingId = invoiceData.financing.data.id;
      } else if (invoiceData.financing?.id) {
        financingId = invoiceData.financing.id;
      } else if (invoiceData.financingId) {
        financingId = invoiceData.financingId;
      } else if (typeof invoiceData.financing === 'number') {
        financingId = invoiceData.financing;
      } else if (typeof invoiceData.financing === 'string') {
        financingId = parseInt(invoiceData.financing);
      }
      const quotaNumber = invoiceData.quotaNumber;
      
      // Si hay financing y quotaNumber, verificar si está cubierta por abono
      if (financingId && quotaNumber) {
        const financingIdNum = typeof financingId === 'string' ? parseInt(financingId) : financingId;
        const isCovered = isQuotaCovered(coveredQuotasMap, financingIdNum, quotaNumber);
        if (isCovered) {
          continue; // No incluir en consulta si está cubierta
        }
      }

      const amount = parseFloat(invoiceData.amount) || 0;
      
      // Calcular días de vencimiento (días naturales DESPUÉS del dueDate)
      const dueParts = invoiceData.dueDate.split('-').map(Number);
      const simParts = simulationDate.split('-').map(Number);
      
      const dueDate = Date.UTC(dueParts[0], dueParts[1] - 1, dueParts[2]);
      const simDate = Date.UTC(simParts[0], simParts[1] - 1, simParts[2]);
      
      const msPerDay = 24 * 60 * 60 * 1000;
      const rawDaysOverdue = Math.round((simDate - dueDate) / msPerDay);
      const daysOverdue = Math.max(1, rawDaysOverdue);
      
      // Penalidad: 10% por día de retraso (acumulativo)
      const penaltyPerDay = (amount * penaltyPercentage) / 100;
      const penaltyAmount = penaltyPerDay * daysOverdue;
      const totalWithPenalty = amount + penaltyAmount;

      overdueInvoices.push({
        id: invoice.id,
        documentId: invoice.documentId,
        receiptNumber: invoiceData.receiptNumber,
        financingId: financingId,
        amount: amount,
        penaltyPerDay: penaltyPerDay,
        daysOverdue: daysOverdue,
        penaltyAmount: penaltyAmount,
        totalWithPenalty: totalWithPenalty,
        dueDate: invoiceData.dueDate,
        quotaNumber: quotaNumber,
      });

      totalPenaltyAmount += penaltyAmount;
    }

    return NextResponse.json({
      success: true,
      overdueCount: overdueInvoices.length,
      totalPenaltyAmount,
      simulationDate,
      penaltyPercentage,
      invoices: overdueInvoices,
    });
  } catch (error) {
    console.error("Error consultando vencidos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
