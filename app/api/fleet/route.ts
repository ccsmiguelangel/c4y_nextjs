import { NextResponse } from "next/server";
import { fetchFleetVehiclesFromStrapi } from "@/lib/fleet";

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




