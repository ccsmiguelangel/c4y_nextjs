import { NextResponse } from "next/server";
import {
  deleteFleetVehicleInStrapi,
  fetchFleetVehicleByIdFromStrapi,
  updateFleetVehicleInStrapi,
} from "@/lib/fleet";
import type { FleetVehicleUpdatePayload } from "@/validations/types";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const vehicle = await fetchFleetVehicleByIdFromStrapi(id);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: vehicle });
  } catch (error) {
    console.error("Error fetching fleet vehicle:", error);
    return NextResponse.json(
      { error: "No pudimos obtener la información del vehículo." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const body = (await request.json()) as { data?: FleetVehicleUpdatePayload };
    if (!body?.data) {
      return NextResponse.json(
        { error: "Payload inválido. Envía los campos dentro de data." },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const updated = await updateFleetVehicleInStrapi(id, body.data);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating fleet vehicle:", error);
    return NextResponse.json(
      { error: "No pudimos actualizar el vehículo. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteFleetVehicleInStrapi(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fleet vehicle:", error);
    return NextResponse.json(
      { error: "No pudimos eliminar el vehículo. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

