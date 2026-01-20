import { NextResponse } from "next/server";
import { fetchAppointmentsFromStrapi, createAppointmentInStrapi } from "@/lib/calendar";
import type { AppointmentCreatePayload } from "@/validations/types";

export async function GET() {
  try {
    const appointments = await fetchAppointmentsFromStrapi();
    return NextResponse.json({ data: appointments });
  } catch (error) {
    console.error("Error fetching appointments data:", error);
    return NextResponse.json(
      { error: "No se pudo obtener las citas desde Strapi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: AppointmentCreatePayload };

    if (!body?.data) {
      return NextResponse.json(
        { error: "Los datos de la cita son requeridos." },
        { status: 400 }
      );
    }

    const { data } = body;

    // Validar campos requeridos: type y scheduledAt
    if (!data.type) {
      return NextResponse.json(
        { error: "El tipo de cita es requerido." },
        { status: 400 }
      );
    }

    if (!data.scheduledAt) {
      return NextResponse.json(
        { error: "La fecha programada es requerida." },
        { status: 400 }
      );
    }

    // Validar tipo de cita
    if (!["venta", "prueba", "mantenimiento"].includes(data.type)) {
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

    // Validar scheduledAt es una fecha válida
    const scheduledDate = new Date(data.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "La fecha programada no es válida." },
        { status: 400 }
      );
    }

    // Validar price si está presente
    if (data.price !== undefined && data.price < 0) {
      return NextResponse.json(
        { error: "El precio no puede ser negativo." },
        { status: 400 }
      );
    }

    // Validar durationMinutes si está presente
    if (data.durationMinutes !== undefined && data.durationMinutes < 0) {
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

    const appointment = await createAppointmentInStrapi(data);
    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    const errorMessage = error instanceof Error ? error.message : "No se pudo crear la cita.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
