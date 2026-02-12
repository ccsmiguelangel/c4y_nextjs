import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

// POST - Simular vencimiento de facturas (modo viernes) - Actualiza las facturas pendientes a retrasadas
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { simulationDate = new Date().toISOString().split('T')[0] } = body;

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

    // Buscar CUOTAS PENDIENTES O RETRASADAS (billing-records) con vencimiento anterior o igual a la fecha de simulación
    const queryUrl = `${STRAPI_BASE_URL}/api/billing-records?filters[status][$in]=pendiente,retrasado&filters[dueDate][$lte]=${simulationDate}&populate=*`;

    const invoicesResponse = await fetch(queryUrl, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: "no-store",
    });

    if (!invoicesResponse.ok) {
      throw new Error("Error obteniendo cuotas pendientes");
    }

    const invoicesData = await invoicesResponse.json();
    
    // Manejar tanto el formato Strapi 4 como Strapi 5
    let invoices: any[] = [];
    if (Array.isArray(invoicesData.data)) {
      invoices = invoicesData.data;
    } else if (invoicesData.data && typeof invoicesData.data === 'object') {
      invoices = [invoicesData.data];
    }

    const updatedInvoices = [];
    let totalPenaltyAmount = 0;

    for (const invoice of invoices) {
      const invoiceData = invoice.attributes || invoice;
      
      // Verificar nuevamente que no esté pagada (doble verificación)
      if (invoiceData.status === "pagado" || invoiceData.status === "adelanto") {
        continue;
      }

      const amount = parseFloat(invoiceData.amount) || 0;
      
      // Calcular días de vencimiento
      const dueDate = new Date(invoiceData.dueDate + 'T00:00:00');
      const simDate = new Date(simulationDate + 'T00:00:00');
      const rawDaysOverdue = Math.ceil((simDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      // Mínimo 1 día de retraso si ya está vencida
      const daysOverdue = Math.max(1, rawDaysOverdue);
      
      // Penalidad: 10% por día de retraso (acumulativo)
      // Ejemplo: $225 × 10% × 2 días = $45.00
      const penaltyPerDay = (amount * penaltyPercentage) / 100;
      const penaltyAmount = penaltyPerDay * daysOverdue;
      const totalWithPenalty = amount + penaltyAmount;

      const recordId = invoice.documentId || invoiceData.documentId || invoice.id;

      // Actualizar cuota a "retrasado" con penalidad
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
              status: "retrasado",
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

    // Buscar cuotas pendientes o retrasadas que estarían vencidas
    const invoicesResponse = await fetch(
      `${STRAPI_BASE_URL}/api/billing-records?filters[status][$in]=pendiente,retrasado&filters[dueDate][$lt]=${simulationDate}&populate=*`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!invoicesResponse.ok) {
      throw new Error("Error obteniendo cuotas");
    }

    const invoicesData = await invoicesResponse.json();
    const invoices = invoicesData.data || [];

    const overdueInvoices = [];
    let totalPenaltyAmount = 0;

    for (const invoice of invoices) {
      const invoiceData = invoice.attributes || invoice;
      
      // Excluir pagadas
      if (invoiceData.status === "pagado" || invoiceData.status === "adelanto") {
        continue;
      }

      const amount = parseFloat(invoiceData.amount) || 0;
      
      const dueDate = new Date(invoiceData.dueDate);
      const simDate = new Date(simulationDate);
      const rawDaysOverdue = Math.ceil((simDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(1, rawDaysOverdue);
      
      // Penalidad: 10% por día de retraso (acumulativo)
      const penaltyPerDay = (amount * penaltyPercentage) / 100;
      const penaltyAmount = penaltyPerDay * daysOverdue;
      const totalWithPenalty = amount + penaltyAmount;

      overdueInvoices.push({
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
