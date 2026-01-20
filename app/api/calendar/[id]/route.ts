import { NextResponse } from "next/server";
import {
  deleteAppointmentInStrapi,
  fetchAppointmentByIdFromStrapi,
  updateAppointmentInStrapi,
} from "@/lib/calendar";
import type { AppointmentUpdatePayload } from "@/validations/types";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const appointment = await fetchAppointmentByIdFromStrapi(id);

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: appointment });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { error: "No pudimos obtener la información de la cita." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const body = (await request.json()) as { data?: AppointmentUpdatePayload };
    if (!body?.data) {
      return NextResponse.json(
        { error: "Payload inválido. Envía los campos dentro de data." },
        { status: 400 }
      );
    }

    const { data } = body;

    // Validar tipo si está presente
    if (data.type && !["venta", "prueba", "mantenimiento"].includes(data.type)) {
      return NextResponse.json(
        { error: "El tipo de cita debe ser 'venta', 'prueba' o 'mantenimiento'." },
        { status: 400 }
      );
    }

    // Validar status si está presente
    if (data.status && !["confirmada", "pendiente", "cancelada"].includes(data.status)) {
      return NextResponse.json(
        { error: "El estado debe ser 'confirmada', 'pendiente' o 'cancelada'." },
        { status: 400 }
      );
    }

    // Validar scheduledAt si está presente
    if (data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: "La fecha programada no es válida." },
          { status: 400 }
        );
      }
    }

    // Validar price si está presente
    if (data.price !== undefined && data.price !== null && data.price < 0) {
      return NextResponse.json(
        { error: "El precio no puede ser negativo." },
        { status: 400 }
      );
    }

    // Validar durationMinutes si está presente
    if (data.durationMinutes !== undefined && data.durationMinutes !== null && data.durationMinutes < 0) {
      return NextResponse.json(
        { error: "La duración no puede ser negativa." },
        { status: 400 }
      );
    }

    // Validar email si está presente
    if (data.contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contactEmail)) {
        return NextResponse.json(
          { error: "El email de contacto no es válido." },
          { status: 400 }
        );
      }
    }

    const { id } = await context.params;
    const updated = await updateAppointmentInStrapi(id, data);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating appointment:", error);
    const errorMessage = error instanceof Error ? error.message : "No pudimos actualizar la cita.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteAppointmentInStrapi(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    const errorMessage = error instanceof Error ? error.message : "No pudimos eliminar la cita.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
