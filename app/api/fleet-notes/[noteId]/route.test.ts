import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PATCH, DELETE } from "./route";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Mock de next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock de @/lib/config
vi.mock("@/lib/config", () => ({
  STRAPI_BASE_URL: "http://localhost:1337",
  STRAPI_API_TOKEN: "test-token",
}));

// Mock global de fetch
global.fetch = vi.fn();

describe("PATCH /api/fleet-notes/[noteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Validación de entrada", () => {
    it("debe retornar 400 si no hay noteId", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "" }),
      };

      const request = new Request("http://localhost/api/fleet-notes/", {
        method: "PATCH",
        body: JSON.stringify({ data: { content: "Test" } }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("noteId es requerido");
    });

    it("debe retornar 400 si el body es inválido", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: "invalid json",
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Body inválido o vacío");
    });

    it("debe retornar 400 si no hay contenido", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({ data: {} }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("El contenido de la nota es requerido.");
    });
  });

  describe("Validación de authorDocumentId", () => {
    it("debe retornar 401 si no se puede obtener el authorDocumentId", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({ data: { content: "Test" } }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("No se pudo obtener la información del usuario");
    });

    it("debe retornar 401 si el user-profile no tiene documentId", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener usuario
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
        }),
      } as Response);

      // Mock de obtener user-profile (sin documentId)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [], // No encontrado
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({ data: { content: "Test" } }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("No se pudo obtener la información del usuario");
    });
  });

  describe("Validación de vehículo", () => {
    it("debe validar que el vehículo existe si se proporciona vehicleId", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener usuario
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
        }),
      } as Response);

      // Mock de obtener user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "user-doc-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      // Mock de validar vehículo (no encontrado)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [], // Vehículo no encontrado
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            content: "Test",
            vehicleId: "invalid-vehicle-id",
          },
        }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Vehículo no encontrado.");
    });
  });

  describe("Actualización de nota", () => {
    it("debe actualizar una nota exitosamente con autor incluido", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener usuario
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
        }),
      } as Response);

      // Mock de obtener user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "user-doc-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      // Mock de actualizar nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-1",
            content: "Contenido actualizado",
            authorDocumentId: "user-doc-id",
            updatedAt: "2025-01-02T00:00:00Z",
          },
        }),
      } as Response);

      // Mock de obtener nota actualizada
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-1",
            content: "Contenido actualizado",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-02T00:00:00Z",
          },
        }),
      } as Response);

      // Mock de obtener autor
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "user-doc-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            content: "Contenido actualizado",
          },
        }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.content).toBe("Contenido actualizado");
      expect(data.data.authorDocumentId).toBe("user-doc-id");
      expect(data.data.author).toBeDefined();
      expect(data.data.author.displayName).toBe("Test User");
    });

    it("debe retornar 404 si la nota no existe", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "non-existent" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener usuario
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
        }),
      } as Response);

      // Mock de obtener user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "user-doc-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      // Mock de error 404 al actualizar
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => JSON.stringify({ error: { message: "Not found" } }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/non-existent", {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            content: "Test",
          },
        }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Nota no encontrada");
    });

    it("debe retornar 405 si el método no está permitido", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener usuario
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
        }),
      } as Response);

      // Mock de obtener user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "user-doc-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      // Mock de error 405
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 405,
        statusText: "Method Not Allowed",
        text: async () => JSON.stringify({ error: { message: "Method not allowed" } }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            content: "Test",
          },
        }),
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toContain("Método no permitido");
    });

    it("debe incluir authorDocumentId en la actualización", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener usuario
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
        }),
      } as Response);

      // Mock de obtener user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "user-doc-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      // Mock de actualizar nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-1",
            content: "Contenido actualizado",
            authorDocumentId: "user-doc-id",
          },
        }),
      } as Response);

      // Mock de obtener nota actualizada
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-1",
            content: "Contenido actualizado",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-02T00:00:00Z",
          },
        }),
      } as Response);

      // Mock de obtener autor
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "user-doc-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            content: "Contenido actualizado",
          },
        }),
      });

      await PATCH(request, mockContext);

      // Verificar que authorDocumentId se envió en la actualización
      const updateCall = vi.mocked(fetch).mock.calls[2];
      const updateBody = JSON.parse(updateCall[1]?.body as string);
      expect(updateBody.data.authorDocumentId).toBe("user-doc-id");
      expect(updateBody.data.content).toBe("Contenido actualizado");
    });
  });

  describe("Manejo de errores", () => {
    it("debe manejar errores inesperados", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      // Simular un error al parsear el body
      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "PATCH",
        body: "invalid json",
      });

      const response = await PATCH(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Body inválido o vacío");
    });
  });
});

describe("DELETE /api/fleet-notes/[noteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Validación de entrada", () => {
    it("debe retornar 400 si no hay noteId", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "" }),
      };

      const request = new Request("http://localhost/api/fleet-notes/", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("noteId es requerido");
    });
  });

  describe("Eliminación de nota", () => {
    it("debe eliminar una nota exitosamente", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      // Mock de eliminar nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-1",
          },
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verificar que se llamó a la URL correcta
      const deleteCall = vi.mocked(fetch).mock.calls[0];
      expect(deleteCall[0]).toBe("http://localhost:1337/api/fleet-notes/note-1");
      expect(deleteCall[1]?.method).toBe("DELETE");
    });

    it("debe retornar 500 si la nota no existe (error genérico)", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "non-existent" }),
      };

      // Mock de error 404 al eliminar
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => JSON.stringify({ error: { message: "Not found" } }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/non-existent", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("debe retornar 500 si no hay permisos (error genérico)", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      // Mock de error 403 al eliminar
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => JSON.stringify({ error: { message: "Forbidden" } }),
      } as Response);

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("Manejo de errores", () => {
    it("debe manejar errores inesperados", async () => {
      const mockContext = {
        params: Promise.resolve({ noteId: "note-1" }),
      };

      vi.mocked(fetch).mockRejectedValue(new Error("Error inesperado"));

      const request = new Request("http://localhost/api/fleet-notes/note-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
