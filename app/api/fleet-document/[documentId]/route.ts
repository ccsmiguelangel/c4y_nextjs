import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

// DELETE - Eliminar un documento
export async function DELETE(_: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { documentId } = params;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId es requerido" },
        { status: 400 }
      );
    }

    const deleteResponse = await fetch(
      `${STRAPI_BASE_URL}/api/fleet-documents/${documentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      let errorData;
      try {
        errorData = errorText ? JSON.parse(errorText) : { error: { message: "Error desconocido" } };
      } catch {
        errorData = { error: { message: errorText || `Error ${deleteResponse.status}` } };
      }
      console.error("Error eliminando documento en Strapi:", {
        status: deleteResponse.status,
        statusText: deleteResponse.statusText,
        error: errorData,
        documentId,
      });
      
      // Si es 404, el tipo de contenido o el documento no existe
      if (deleteResponse.status === 404) {
        throw new Error("El documento no fue encontrado o el tipo de contenido 'fleet-documents' no existe en Strapi.");
      }
      
      throw new Error(errorData.error?.message || `Error ${deleteResponse.status}: ${deleteResponse.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fleet document:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
