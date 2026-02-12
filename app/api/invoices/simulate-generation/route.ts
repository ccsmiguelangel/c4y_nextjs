import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

// POST - Simular generación de facturas (modo martes)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { simulationDate = new Date().toISOString().split('T')[0] } = body;

    // Obtener financiamientos activos con pagos (billing-records)
    const financingResponse = await fetch(
      `${STRAPI_BASE_URL}/api/financings?filters[status][$eq]=activo&populate[0]=client&populate[1]=vehicle`,
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!financingResponse.ok) {
      throw new Error("Error obteniendo financiamientos");
    }

    const financingData = await financingResponse.json();
    const financings = financingData.data || [];

    // Calcular jueves de la semana de simulación
    const simDate = new Date(simulationDate);
    const currentDay = simDate.getDay();
    const daysUntilThursday = (4 - currentDay + 7) % 7 || 7;
    const thursday = new Date(simDate);
    thursday.setDate(simDate.getDate() + daysUntilThursday);
    const dueDate = thursday.toISOString().split('T')[0];

    const generatedInvoices = [];
    let generatedCount = 0;

    for (const financing of financings) {
      // Verificar si ya existe una factura para este financiamiento en esta fecha
      const existingResponse = await fetch(
        `${STRAPI_BASE_URL}/api/billing-records?filters[financing][id][$eq]=${financing.id}&filters[dueDate][$eq]=${dueDate}`,
        {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
          cache: "no-store",
        }
      );

      const existingData = await existingResponse.json();
      if (existingData.data && existingData.data.length > 0) {
        continue; // Ya existe un pago/factura para este período
      }

      // Obtener el máximo quotaNumber existente para este financiamiento
      const maxQuotaResponse = await fetch(
        `${STRAPI_BASE_URL}/api/billing-records?filters[financing][id][$eq]=${financing.id}&sort=quotaNumber:desc&pagination[limit]=1`,
        {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
          cache: "no-store",
        }
      );
      
      const maxQuotaData = await maxQuotaResponse.json();
      const maxQuotaNumber = maxQuotaData.data?.[0]?.quotaNumber || 0;
      
      // Calcular número de cuota siguiente basado en el máximo existente
      const nextQuotaNumber = maxQuotaNumber + 1;
      
      // Verificar que no exceda el total de cuotas
      if (nextQuotaNumber > (financing.totalQuotas || 999)) {
        continue;
      }

      // Crear el pago/cuota simulada (billing-record)
      const invoicePayload = {
        data: {
          financing: financing.id,
          receiptNumber: `SIM-${simulationDate.replace(/-/g, '')}-${financing.id}-${nextQuotaNumber}`,
          amount: financing.quotaAmount,
          currency: "USD",
          status: "pendiente",
          dueDate: dueDate,
          quotaNumber: nextQuotaNumber,
          lateFeeAmount: 0,
          isSimulated: true,
        },
      };

      const createResponse = await fetch(
        `${STRAPI_BASE_URL}/api/billing-records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invoicePayload),
          cache: "no-store",
        }
      );

      if (createResponse.ok) {
        const invoiceData = await createResponse.json();
        generatedInvoices.push({
          id: invoiceData.data.id,
          receiptNumber: invoiceData.data.receiptNumber,
          financingId: financing.id,
          amount: financing.quotaAmount,
          quotaNumber: nextQuotaNumber,
        });
        generatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      generatedCount,
      invoices: generatedInvoices,
      simulationDate,
      dueDate,
    });
  } catch (error) {
    console.error("Error en simulación de generación:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
