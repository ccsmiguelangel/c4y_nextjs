import { NextResponse } from "next/server";
import {
  fetchBillingRecordByIdFromStrapi,
  updateBillingRecordInStrapi,
  deleteBillingRecordInStrapi,
} from "@/lib/billing";
import type { BillingRecordUpdatePayload } from "@/validations/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await fetchBillingRecordByIdFromStrapi(id);

    if (!record) {
      return NextResponse.json(
        { error: "Registro de facturación no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    console.error("Error fetching billing record:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el registro de facturación." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { data?: BillingRecordUpdatePayload };

    if (!body?.data) {
      return NextResponse.json(
        { error: "Los datos de actualización son requeridos." },
        { status: 400 }
      );
    }

    const { data } = body;

    // Validar monto si está presente
    if (data.amount !== undefined && data.amount !== null) {
      if (typeof data.amount !== "number" || data.amount < 0) {
        return NextResponse.json(
          { error: "El monto debe ser un número válido mayor o igual a 0." },
          { status: 400 }
        );
      }
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

    // Validar remindersSent si está presente
    if (data.remindersSent !== undefined && data.remindersSent !== null) {
      if (typeof data.remindersSent !== "number" || data.remindersSent < 0) {
        return NextResponse.json(
          { error: "El número de recordatorios enviados debe ser un número válido mayor o igual a 0." },
          { status: 400 }
        );
      }
    }

    const record = await updateBillingRecordInStrapi(id, data);
    return NextResponse.json({ data: record });
  } catch (error) {
    console.error("Error updating billing record:", error);
    const errorMessage = error instanceof Error ? error.message : "No se pudo actualizar el registro de facturación.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteBillingRecordInStrapi(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting billing record:", error);
    const errorMessage = error instanceof Error ? error.message : "No se pudo eliminar el registro de facturación.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
