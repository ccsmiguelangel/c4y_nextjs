import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

// Función auxiliar: Verifica si una cuota está cubierta por abono/adelanto
async function isQuotaCoveredByAdvance(financingId: number, quotaNumber: number): Promise<boolean> {
  try {
    // Obtener todos los billing-records del financing
    const response = await fetch(
      `${STRAPI_BASE_URL}/api/billing-records?filters[financing][id][$eq]=${financingId}&fields[0]=quotaNumber&fields[1]=status&fields[2]=quotasCovered&pagination[limit]=100`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );
    
    if (!response.ok) return false;
    
    const data = await response.json();
    const records = data.data || [];
    
    // Calcular cuotas cubiertas
    for (const record of records) {
      if (record.status === "pagado" && record.quotaNumber === quotaNumber) {
        // Cuota pagada individualmente
        return true;
      } else if ((record.status === "abonado" || record.status === "adelanto") && record.quotaNumber) {
        // Abono/adelanto cubre un rango de cuotas
        const quotasCovered = record.quotasCovered || 1;
        const startQuota = record.quotaNumber;
        const endQuota = startQuota + quotasCovered - 1;
        
        if (quotaNumber >= startQuota && quotaNumber <= endQuota) {
          return true; // La cuota está dentro del rango cubierto
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`[isQuotaCoveredByAdvance] Error verificando cuota ${quotaNumber}:`, error);
    return false;
  }
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
      const pendingQueryUrl = `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=pendiente&filters[dueDate][$lte]=${simulationDate}&populate=*`;
      
      const pendingResponse = await fetch(pendingQueryUrl, {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      });

      if (!pendingResponse.ok) {
        throw new Error("Error obteniendo cuotas pendientes");
      }

      const pendingData = await pendingResponse.json();
      pendingInvoices = pendingData.data || [];
    }
    
    // Buscar CUOTAS YA RETRASADAS para recalcular multas (siempre, en ambos modos)
    const overdueQueryUrl = `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=retrasado&filters[dueDate][$lte]=${simulationDate}&populate=*`;
    
    const overdueResponse = await fetch(overdueQueryUrl, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: "no-store",
    });

    const overdueData = overdueResponse.ok ? await overdueResponse.json() : { data: [] };
    existingOverdue = overdueData.data || [];

    // Combinar resultados
    let invoices: any[] = [...pendingInvoices, ...existingOverdue];
    if (!Array.isArray(invoices)) {
      invoices = [];
    }

    const updatedInvoices = [];
    let totalPenaltyAmount = 0;

    for (const invoice of invoices) {
      const invoiceData = invoice.attributes || invoice;
      
      // Verificar nuevamente que no esté pagada (doble verificación)
      if (invoiceData.status === "pagado" || invoiceData.status === "adelanto") {
        continue;
      }
      
      // Obtener el financingId asociado al record
      const financingId = invoiceData.financing?.id || invoiceData.financing?.data?.id;
      const quotaNumber = invoiceData.quotaNumber;
      
      // Si hay financing y quotaNumber, verificar si está cubierta por abono
      if (financingId && quotaNumber) {
        const isCovered = await isQuotaCoveredByAdvance(financingId, quotaNumber);
        if (isCovered) {
          console.log(`[SimulateOverdue] Cuota #${quotaNumber} de financing ${financingId} está cubierta por abono, no se marca como retrasada`);
          continue; // No marcar como retrasado si está cubierta
        }
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
      `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=pendiente&filters[dueDate][$lt]=${simulationDate}&populate=*`,
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
      `${STRAPI_BASE_URL}/api/billing-records?filters[status][$eq]=retrasado&filters[dueDate][$lt]=${simulationDate}&populate=*`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );
    
    const overdueData = overdueResponse.ok ? await overdueResponse.json() : { data: [] };

    // Combinar resultados
    const invoices = [...(pendingData.data || []), ...(overdueData.data || [])];

    const overdueInvoices = [];
    let totalPenaltyAmount = 0;

    for (const invoice of invoices) {
      const invoiceData = invoice.attributes || invoice;
      
      // Excluir pagadas
      if (invoiceData.status === "pagado" || invoiceData.status === "adelanto") {
        continue;
      }
      
      // Obtener el financingId y quotaNumber
      const financingId = invoiceData.financing?.id || invoiceData.financing?.data?.id;
      const quotaNumber = invoiceData.quotaNumber;
      
      // Si hay financing y quotaNumber, verificar si está cubierta por abono
      if (financingId && quotaNumber) {
        const isCovered = await isQuotaCoveredByAdvance(financingId, quotaNumber);
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
