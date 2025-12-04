import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const hasFile = Array.from(formData.keys()).some((key) => key === "files");

    if (!hasFile) {
      return NextResponse.json({ error: "Debes adjuntar un archivo." }, { status: 400 });
    }

    const response = await fetch(`${STRAPI_BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error("Error subiendo archivo a Strapi:", errorMessage);
      return NextResponse.json(
        { error: "No pudimos subir la imagen. Intenta nuevamente." },
        { status: 500 }
      );
    }

    const payload = (await response.json()) as Array<{ id: number; url?: string }>;
    const file = payload?.[0];

    if (!file?.id) {
      return NextResponse.json(
        { error: "Strapi no devolvió la información del archivo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: file });
  } catch (error) {
    console.error("Error interno al subir archivo:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al subir la imagen." },
      { status: 500 }
    );
  }
}




