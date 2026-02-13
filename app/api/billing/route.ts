import { NextResponse } from "next/server";
import {
  fetchBillingRecordsFromStrapi,
  fetchBillingRecordsByFinancingFromStrapi,
  createBillingRecordInStrapi,
  type BillingRecordCreatePayload,
} from "@/lib/billing";
import { fetchFinancingByIdFromStrapi } from "@/lib/financing";

/**
 * GET /api/billing
 * Obtener todos los pagos o filtrar por financing
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const financingId = searchParams.get('financing');
    
    if (financingId) {
      // Obtener pagos específicos de un financiamiento
      console.log(`[API Billing] Fetching records for financing: ${financingId}`);
      const records = await fetchBillingRecordsByFinancingFromStrapi(financingId);
      console.log(`[API Billing] Found ${records.length} records`);
      return NextResponse.json({ data: records });
    }
    
    // Obtener todos los pagos
    const records = await fetchBillingRecordsFromStrapi();
    return NextResponse.json({ data: records });
  } catch (error) {
    console.error("Error fetching billing records:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los pagos." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing
 * Crear un nuevo pago
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = body as { data?: BillingRecordCreatePayload };

    if (!data) {
      return NextResponse.json(
        { error: "Los datos del pago son requeridos." },
        { status: 400 }
      );
    }

    // Validaciones
    if (!data.financing) {
      return NextResponse.json(
        { error: "El financiamiento es requerido." },
        { status: 400 }
      );
    }

    if (!data.amount || data.amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0." },
        { status: 400 }
      );
    }

    if (!data.quotaNumber || data.quotaNumber < 1) {
      return NextResponse.json(
        { error: "El número de cuota es requerido." },
        { status: 400 }
      );
    }

    if (!data.dueDate) {
      return NextResponse.json(
        { error: "La fecha de vencimiento es requerida." },
        { status: 400 }
      );
    }

    // Obtener el financiamiento para calcular multas y cuotas
    const financing = await fetchFinancingByIdFromStrapi(data.financing);
    if (!financing) {
      return NextResponse.json(
        { error: "Financiamiento no encontrado." },
        { status: 404 }
      );
    }

    // Validar que el financiamiento esté activo
    if (financing.status === "completado") {
      return NextResponse.json(
        { error: "Este financiamiento ya está completado." },
        { status: 400 }
      );
    }

    if (financing.status === "inactivo") {
      return NextResponse.json(
        { error: "Este financiamiento está inactivo." },
        { status: 400 }
      );
    }

    const record = await createBillingRecordInStrapi(data, financing);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    console.error("Error creating billing record:", error);

    let errorMessage = "No se pudo crear el pago.";
    let statusCode = 500;

    if (error instanceof Error) {
      const message = error.message;

      if (message.includes("unique") || message.includes("already exists")) {
        errorMessage = "Ya existe un pago con este número de recibo.";
        statusCode = 400;
      } else if (message.includes("ValidationError")) {
        errorMessage = "Error de validación: verifica los datos ingresados.";
        statusCode = 400;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
