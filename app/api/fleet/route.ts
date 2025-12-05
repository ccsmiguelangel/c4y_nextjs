import { NextResponse } from "next/server";
import { fetchFleetVehiclesFromStrapi, createFleetVehicleInStrapi, type FleetVehicleCreatePayload } from "@/lib/fleet";

export async function GET() {
  try {
    const vehicles = await fetchFleetVehiclesFromStrapi();
    return NextResponse.json({ data: vehicles });
  } catch (error) {
    console.error("Error fetching fleet data:", error);
    return NextResponse.json(
      { error: "No se pudo obtener la flota desde Strapi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: FleetVehicleCreatePayload };
    
    if (!body?.data) {
      return NextResponse.json(
        { error: "Los datos del vehículo son requeridos." },
        { status: 400 }
      );
    }

    const { data } = body;

    // Validar campos requeridos
    if (!data.name || !data.vin || !data.price || !data.condition || !data.brand || !data.model || !data.year) {
      return NextResponse.json(
        { error: "Todos los campos requeridos deben estar presentes." },
        { status: 400 }
      );
    }

    // Validar año
    if (data.year < 1900 || data.year > 2100) {
      return NextResponse.json(
        { error: "El año debe estar entre 1900 y 2100." },
        { status: 400 }
      );
    }

    // Validar condición
    if (!["nuevo", "usado", "seminuevo"].includes(data.condition)) {
      return NextResponse.json(
        { error: "La condición debe ser 'nuevo', 'usado' o 'seminuevo'." },
        { status: 400 }
      );
    }

    // Validar mileage si está presente
    if (data.mileage !== undefined && data.mileage !== null && data.mileage < 0) {
      return NextResponse.json(
        { error: "El kilometraje no puede ser negativo." },
        { status: 400 }
      );
    }

    const vehicle = await createFleetVehicleInStrapi(data);
    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) {
    console.error("Error creating fleet vehicle:", error);
    const errorMessage = error instanceof Error ? error.message : "No se pudo crear el vehículo.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




