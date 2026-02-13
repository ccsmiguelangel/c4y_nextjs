import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

// POST - Simular generación de facturas (modo martes)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { simulationDate = new Date().toISOString().split('T')[0], currentWeek = 1 } = body;

    // Obtener financiamientos activos con pagos (billing-records)
    // fields[0]=documentId para obtener el documentId necesario para relaciones
    const financingResponse = await fetch(
      `${STRAPI_BASE_URL}/api/financings?filters[status][$eq]=activo&fields[0]=documentId&fields[1]=quotaAmount&fields[2]=totalQuotas&populate[0]=client&populate[1]=vehicle`,
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
    console.log(`[SimulateGeneration] Financiamientos activos: ${financings.length}`);
    if (financings.length > 0) {
      console.log(`[SimulateGeneration] Primer financing:`, { 
        id: financings[0].id, 
        documentId: financings[0].documentId 
      });
    }

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
      // Usar documentId del financing para las relaciones (Strapi 5)
      const financingDocumentId = financing.documentId || financing.id;
      
      // Verificar si ya existe una factura para este financiamiento en esta fecha
      const existingResponse = await fetch(
        `${STRAPI_BASE_URL}/api/billing-records?filters[financing][documentId][$eq]=${financingDocumentId}&filters[dueDate][$eq]=${dueDate}`,
        {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
          cache: "no-store",
        }
      );

      const existingData = await existingResponse.json();
      if (existingData.data && existingData.data.length > 0) {
        continue; // Ya existe un pago/factura para este período
      }

      // Obtener TODOS los billing-records para calcular cuotas cubiertas
      const allRecordsResponse = await fetch(
        `${STRAPI_BASE_URL}/api/billing-records?filters[financing][documentId][$eq]=${financingDocumentId}&fields[0]=quotaNumber&fields[1]=status&fields[2]=quotasCovered&pagination[limit]=100`,
        {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
          cache: "no-store",
        }
      );
      
      const allRecordsData = await allRecordsResponse.json();
      const allRecords = allRecordsData.data || [];
      
      // Calcular cuántas cuotas están cubiertas por pagos/abonos/adelantos
      const coveredQuotas = new Set<number>();
      
      for (const record of allRecords) {
        if (record.status === "pagado" && record.quotaNumber) {
          // Cuota pagada individual
          coveredQuotas.add(record.quotaNumber);
        } else if ((record.status === "abonado" || record.status === "adelanto") && record.quotaNumber) {
          // Abono/adelanto cubre múltiples cuotas
          const quotasCovered = record.quotasCovered || 1;
          for (let i = 0; i < quotasCovered; i++) {
            coveredQuotas.add(record.quotaNumber + i);
          }
        }
      }
      
      // La cuota a generar corresponde a la semana actual de simulación
      const quotaNumberToGenerate = currentWeek;
      
      // Verificar que no exceda el total de cuotas del financiamiento
      if (quotaNumberToGenerate > (financing.totalQuotas || 999)) {
        continue; // Ya se generaron todas las cuotas
      }
      
      // Si la cuota de esta semana ya está cubierta por abono/adelanto, no generar nada
      if (coveredQuotas.has(quotaNumberToGenerate)) {
        console.log(`[SimulateGeneration] Cuota #${quotaNumberToGenerate} ya cubierta para financing ${financingDocumentId}, no se genera`);
        continue;
      }
      
      // Verificar si ya existe un billing-record para esta cuota específica
      const existingQuotaResponse = await fetch(
        `${STRAPI_BASE_URL}/api/billing-records?filters[financing][documentId][$eq]=${financingDocumentId}&filters[quotaNumber][$eq]=${quotaNumberToGenerate}`,
        {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
          cache: "no-store",
        }
      );
      
      const existingQuotaData = await existingQuotaResponse.json();
      if (existingQuotaData.data && existingQuotaData.data.length > 0) {
        continue; // Ya existe un registro para esta cuota
      }

      // Crear el pago/cuota simulada (billing-record) para la semana actual
      // NOTA: Usar financingDocumentId (el documentId de Strapi 5) para la relación
      const invoicePayload = {
        data: {
          financing: financingDocumentId,
          receiptNumber: `SIM-${simulationDate.replace(/-/g, '')}-${financingDocumentId}-${quotaNumberToGenerate}`,
          amount: financing.quotaAmount,
          currency: "USD",
          status: "pendiente",
          dueDate: dueDate,
          quotaNumber: quotaNumberToGenerate,
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
        const newInvoice = {
          id: invoiceData.data.id,
          receiptNumber: invoiceData.data.receiptNumber,
          financingId: financingDocumentId,
          amount: financing.quotaAmount,
          quotaNumber: quotaNumberToGenerate,
        };
        generatedInvoices.push(newInvoice);
        generatedCount++;
        
        // ================================================================
        // PASO 2: Revisar adelantos que ahora aplican a esta cuota generada
        // y convertirlos a abonados
        // ================================================================
        await convertAdvanceToPartial(financingDocumentId, quotaNumberToGenerate, financing.quotaAmount);
      }
    }
    
    // Función auxiliar: Convierte adelantos a abonados cuando aplican a cuotas generadas
    async function convertAdvanceToPartial(
      financingDocumentId: string | number, 
      newQuotaNumber: number, 
      quotaAmount: number
    ): Promise<void> {
      try {
        // Buscar billing-records con status "adelanto" para este financiamiento
        // Usar documentId para la relación en Strapi 5
        const advanceResponse = await fetch(
          `${STRAPI_BASE_URL}/api/billing-records?` + 
          `filters[financing][documentId][$eq]=${financingDocumentId}&` +
          `filters[status][$eq]=adelanto&` +
          `fields[0]=documentId&fields[1]=quotaNumber&fields[2]=quotasCovered&fields[3]=advanceCredit&` +
          `fields[4]=quotaAmountCovered&fields[5]=remainingQuotaBalance`,
          {
            headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
            cache: "no-store",
          }
        );
        
        if (!advanceResponse.ok) return;
        
        const advanceData = await advanceResponse.json();
        const advanceRecords = advanceData.data || [];
        
        for (const record of advanceRecords) {
          const { documentId, quotaNumber, quotasCovered, advanceCredit, quotaAmountCovered } = record;
          
          // Verificar si este adelanto aplica a la cuota recién generada
          const coversNewQuota = 
            // Caso 1: El adelanto cubre múltiples cuotas y la nueva cae en el rango
            (quotasCovered > 1 && quotaNumber && newQuotaNumber >= quotaNumber && newQuotaNumber < quotaNumber + quotasCovered) ||
            // Caso 2: El adelanto tiene crédito para cuotas futuras
            (advanceCredit > 0 && quotaNumber && newQuotaNumber > quotaNumber);
          
          if (coversNewQuota) {
            // Calcular el nuevo saldo pendiente
            const remainingBalance = Math.max(0, quotaAmount - (advanceCredit || 0));
            
            // Actualizar el registro a status "abonado"
            await fetch(
              `${STRAPI_BASE_URL}/api/billing-records/${documentId}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  data: {
                    status: "abonado",
                    remainingQuotaBalance: remainingBalance,
                    // Mantener el crédito que sobra para futuras cuotas
                    advanceCredit: remainingBalance === 0 ? advanceCredit : 0,
                  },
                }),
                cache: "no-store",
              }
            );
            
            console.log(`[SimulateGeneration] Convertido adelanto ${documentId} a abonado para cuota ${newQuotaNumber}`);
          }
        }
      } catch (error) {
        console.error("[SimulateGeneration] Error convirtiendo adelantos a abonados:", error);
        // No lanzamos el error para no bloquear la generación
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
