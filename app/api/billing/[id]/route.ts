import { NextResponse } from "next/server";
import {
  fetchBillingRecordByIdFromStrapi,
  updateBillingRecordInStrapi,
  deleteBillingRecordFromStrapi,
  verifyBillingRecordInStrapi,
  type BillingRecordUpdatePayload,
} from "@/lib/billing";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/billing/[id]
 * Obtener un pago por ID
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await fetchBillingRecordByIdFromStrapi(id);

    if (!record) {
      return NextResponse.json(
        { error: "Pago no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    console.error("Error fetching billing record:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el pago." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/billing/[id]
 * Actualizar un pago
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { data, action } = body as { 
      data?: BillingRecordUpdatePayload;
      action?: "verify";
    };

    // Acción especial: verificar pago
    if (action === "verify") {
      const { verifiedBy } = body as { verifiedBy?: string };
      // verifiedBy es opcional - si no hay ID válido, solo se marca como verificado
      const record = await verifyBillingRecordInStrapi(id, verifiedBy);
      return NextResponse.json({ data: record });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Los datos de actualización son requeridos." },
        { status: 400 }
      );
    }

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
      if (!["pagado", "pendiente", "adelanto", "retrasado", "abonado"].includes(data.status)) {
        return NextResponse.json(
          { error: "El estado debe ser 'pagado', 'pendiente', 'adelanto', 'retrasado' o 'abonado'." },
          { status: 400 }
        );
      }
    }

    const record = await updateBillingRecordInStrapi(id, data);
    return NextResponse.json({ data: record });
  } catch (error) {
    console.error("Error updating billing record:", error);
    
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json(
        { error: "Pago no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo actualizar el pago." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing/[id]
 * Eliminar un pago
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    console.log(`[API DELETE /api/billing/${id}] Iniciando eliminación`);
    
    await deleteBillingRecordFromStrapi(id);
    
    console.log(`[API DELETE /api/billing/${id}] Eliminación exitosa`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API DELETE] Error detallado:", error);
    
    if (error instanceof Error) {
      console.error("[API DELETE] Error message:", error.message);
      console.error("[API DELETE] Error stack:", error.stack);
      
      if (error.message.includes("404")) {
        return NextResponse.json(
          { error: "Pago no encontrado." },
          { status: 404 }
        );
      }
      
      // Devolver el mensaje de error específico para debugging
      return NextResponse.json(
        { error: `Error al eliminar: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo eliminar el pago." },
      { status: 500 }
    );
  }
}
