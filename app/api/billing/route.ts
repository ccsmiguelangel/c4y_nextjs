import { NextResponse } from "next/server";
import {
  fetchBillingRecordsFromStrapi,
  createBillingRecordInStrapi,
} from "@/lib/billing";
import type { BillingRecordCreatePayload } from "@/validations/types";

export async function GET() {
  try {
    const records = await fetchBillingRecordsFromStrapi();
    return NextResponse.json({ data: records });
  } catch (error) {
    console.error("Error fetching billing data:", error);
    return NextResponse.json(
      { error: "No se pudo obtener los registros de facturación desde Strapi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: BillingRecordCreatePayload };

    if (!body?.data) {
      return NextResponse.json(
        { error: "Los datos del registro de facturación son requeridos." },
        { status: 400 }
      );
    }

    const { data } = body;

    // Validar campos requeridos
    if (!data.invoiceNumber) {
      return NextResponse.json(
        { error: "El número de factura es requerido." },
        { status: 400 }
      );
    }

    if (data.amount === undefined || data.amount === null) {
      return NextResponse.json(
        { error: "El monto es requerido." },
        { status: 400 }
      );
    }

    if (typeof data.amount !== "number" || data.amount < 0) {
      return NextResponse.json(
        { error: "El monto debe ser un número válido mayor o igual a 0." },
        { status: 400 }
      );
    }

    // Validar status si está presente
    if (data.status !== undefined) {
      if (!["pagado", "pendiente", "retrasado"].includes(data.status)) {
        return NextResponse.json(
          { error: "El estado debe ser 'pagado', 'pendiente' o 'retrasado'." },
          { status: 400 }
        );
      }
    }

    const record = await createBillingRecordInStrapi(data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    console.error("Error creating billing record:", error);
    const errorMessage = error instanceof Error ? error.message : "No se pudo crear el registro de facturación.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
