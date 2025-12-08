import { NextResponse } from "next/server";
import { STRAPI_API_TOKEN, STRAPI_BASE_URL } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const hasFile = Array.from(formData.keys()).some((key) => key === "files");

    if (!hasFile) {
      return NextResponse.json({ error: "Debes adjuntar un archivo." }, { status: 400 });
    }

    // Verificar información del archivo para depuración
    let fileToUpload = formData.get("files") as File | null;
    if (fileToUpload) {
      const originalName = fileToUpload.name;
      
      // Renombrar archivo si el nombre es demasiado largo (máximo 200 caracteres)
      // Esto evita el error "File name too long" en sistemas Unix/macOS
      const MAX_FILENAME_LENGTH = 200;
      if (fileToUpload.name.length > MAX_FILENAME_LENGTH) {
        const extension = fileToUpload.name.split('.').pop() || '';
        const timestamp = Date.now();
        const hash = Math.random().toString(36).substring(2, 15);
        const newName = `image_${timestamp}_${hash}.${extension}`;
        
        // Crear un nuevo File con el nombre acortado
        fileToUpload = new File([fileToUpload], newName, {
          type: fileToUpload.type,
          lastModified: fileToUpload.lastModified,
        });
        
        // Reemplazar el archivo en el FormData
        formData.delete("files");
        formData.append("files", fileToUpload);
        
        console.log("Nombre de archivo acortado:", {
          original: originalName,
          nuevo: newName,
          longitudOriginal: originalName.length,
        });
      }
      
      console.log("Subiendo archivo:", {
        name: fileToUpload.name,
        type: fileToUpload.type,
        size: fileToUpload.size,
        sizeMB: (fileToUpload.size / (1024 * 1024)).toFixed(2),
      });
    }

    const response = await fetch(`${STRAPI_BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        // No establecer Content-Type, el navegador lo hace automáticamente con el boundary correcto
      },
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) {
      let errorMessage = "No pudimos subir la imagen. Intenta nuevamente.";
      try {
        const errorText = await response.text();
        console.error("Error subiendo archivo a Strapi:", errorText);
        // Intentar parsear como JSON si es posible
        try {
          const errorJson = JSON.parse(errorText);
          // Strapi devuelve el error en formato: {error: {message: "...", status: 500, name: "..."}}
          if (errorJson?.error) {
            if (typeof errorJson.error === 'string') {
              errorMessage = errorJson.error;
            } else if (errorJson.error.message) {
              errorMessage = errorJson.error.message;
            } else if (errorJson.error.name) {
              errorMessage = `${errorJson.error.name}: ${errorJson.error.message || 'Error desconocido'}`;
            }
          }
        } catch {
          // Si no es JSON, usar el texto directamente si tiene información útil
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        }
      } catch (parseError) {
        console.error("Error parseando respuesta de error:", parseError);
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status || 500 }
      );
    }

    const payload = (await response.json()) as Array<{ id: number; url?: string }>;
    const uploadedFile = payload?.[0];

    if (!uploadedFile?.id) {
      return NextResponse.json(
        { error: "Strapi no devolvió la información del archivo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: uploadedFile });
  } catch (error) {
    console.error("Error interno al subir archivo:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al subir la imagen." },
      { status: 500 }
    );
  }
}
