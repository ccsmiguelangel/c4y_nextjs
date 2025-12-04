import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";
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

// Mock de @/lib/fleet
vi.mock("@/lib/fleet", () => ({
  fetchFleetVehicleByIdFromStrapi: vi.fn(),
}));

// Mock global de fetch
global.fetch = vi.fn();

describe("GET /api/fleet/[id]/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Obtención de notas", () => {
    it("debe retornar las notas con información del autor", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      // Mock de fetchFleetVehicleByIdFromStrapi - esta función hace fetch internamente
      const { fetchFleetVehicleByIdFromStrapi } = await import("@/lib/fleet");
      vi.mocked(fetchFleetVehicleByIdFromStrapi).mockResolvedValue({
        id: 1,
        documentId: "vehicle-doc-id",
      } as any);

      // Mock de búsqueda de vehículo (para obtener el ID numérico)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

      // Mock de búsqueda de notas
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "note-1",
              content: "Nota 1",
              authorDocumentId: "user-doc-id-1",
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
            {
              id: 2,
              documentId: "note-2",
              content: "Nota 2",
              authorDocumentId: "user-doc-id-2",
              createdAt: "2025-01-02T00:00:00Z",
              updatedAt: "2025-01-02T00:00:00Z",
            },
          ],
        }),
      } as Response);

      // Mock de búsqueda de autores (primera nota)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "user-doc-id-1",
              displayName: "Usuario 1",
              email: "user1@example.com",
            },
          ],
        }),
      } as Response);

      // Mock de búsqueda de autores (segunda nota)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 2,
              documentId: "user-doc-id-2",
              displayName: "Usuario 2",
              email: "user2@example.com",
            },
          ],
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes");
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].author).toBeDefined();
      expect(data.data[0].author.displayName).toBe("Usuario 1");
      expect(data.data[1].author).toBeDefined();
      expect(data.data[1].author.displayName).toBe("Usuario 2");
    });

    it("debe manejar notas sin authorDocumentId (notas antiguas)", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      const { fetchFleetVehicleByIdFromStrapi } = await import("@/lib/fleet");
      vi.mocked(fetchFleetVehicleByIdFromStrapi).mockResolvedValue({
        id: 1,
        documentId: "vehicle-doc-id",
      } as any);

      // Mock de búsqueda de vehículo (para obtener el ID numérico)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

      // Mock de búsqueda de notas sin authorDocumentId
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "note-1",
              content: "Nota antigua",
              authorDocumentId: null,
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
          ],
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes");
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].authorDocumentId).toBeNull();
      // No debe intentar buscar el autor si no hay authorDocumentId
      expect(data.data[0].author).toBeUndefined();
    });

    it("debe manejar errores al obtener el vehículo", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "invalid-id" }),
      };

      const { fetchFleetVehicleByIdFromStrapi } = await import("@/lib/fleet");
      vi.mocked(fetchFleetVehicleByIdFromStrapi).mockRejectedValue(
        new Error("Vehículo no encontrado")
      );

      const request = new Request("http://localhost/api/fleet/invalid-id/notes");
      const response = await GET(request, mockContext);

      expect(response.status).toBe(500);
    });
  });
});

describe("POST /api/fleet/[id]/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Validación de entrada", () => {
    it("debe retornar 400 si no hay contenido", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({ data: {} }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("El contenido de la nota es requerido.");
    });

    it("debe retornar 400 si el contenido está vacío", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({ data: { content: "" } }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("El contenido de la nota es requerido.");
    });
  });

  describe("Validación de authorDocumentId", () => {
    it("debe rechazar si authorDocumentId es null desde el frontend y no se puede obtener del usuario", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener vehículo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

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
          data: [],
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Test",
            authorDocumentId: null, // null explícito
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      // El código primero intenta obtener del usuario, si falla retorna 401
      expect(response.status).toBe(401);
      expect(data.error).toContain("No se pudo obtener la información del usuario");
    });

    it("debe usar authorDocumentId del frontend si está presente", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener vehículo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

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

      // Mock de crear nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-doc-id",
            content: "Test",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
      } as Response);

      // Mock de obtener nota creada
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-doc-id",
            content: "Test",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Test",
            authorDocumentId: "user-doc-id",
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.authorDocumentId).toBe("user-doc-id");
      expect(data.data.author).toBeDefined();
      expect(data.data.author.displayName).toBe("Test User");
    });

    it("debe obtener authorDocumentId del usuario logueado si no viene del frontend", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener vehículo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

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

      // Mock de crear nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-doc-id",
            content: "Test",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
      } as Response);

      // Mock de obtener nota creada
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-doc-id",
            content: "Test",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Test",
            // Sin authorDocumentId
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.authorDocumentId).toBe("user-doc-id");
      expect(data.data.author).toBeDefined();
    });

    it("debe retornar 401 si no se puede obtener el authorDocumentId", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener vehículo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

      // Mock de obtener usuario
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
        }),
      } as Response);

      // Mock de obtener user-profile (no encontrado)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [], // No encontrado
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Test",
            // Sin authorDocumentId
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("No se pudo obtener la información del usuario");
    });
  });

  describe("Creación de nota", () => {
    it("debe crear una nota con autor incluido en la respuesta", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener vehículo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

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

      // Mock de crear nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-doc-id",
            content: "Nueva nota",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
      } as Response);

      // Mock de obtener nota creada
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-doc-id",
            content: "Nueva nota",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Nueva nota",
            authorDocumentId: "user-doc-id",
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.content).toBe("Nueva nota");
      expect(data.data.authorDocumentId).toBe("user-doc-id");
      expect(data.data.author).toBeDefined();
      expect(data.data.author.displayName).toBe("Test User");
      expect(data.data.author.email).toBe("test@example.com");
    });

    it("debe incluir el autor incluso si falla la segunda consulta", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener vehículo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

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

      // Mock de crear nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: 1,
            documentId: "note-doc-id",
            content: "Nueva nota",
            authorDocumentId: "user-doc-id",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
      } as Response);

      // Mock de obtener nota creada (falla)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Nueva nota",
            authorDocumentId: "user-doc-id",
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.author).toBeDefined();
      expect(data.data.author.displayName).toBe("Test User");
    });

    it("debe retornar error si Strapi rechaza la creación", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de obtener vehículo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1 }],
        }),
      } as Response);

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

      // Mock de error al crear nota en Strapi
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => JSON.stringify({ error: { message: "No tienes permisos" } }),
      } as Response);

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Nueva nota",
            authorDocumentId: "user-doc-id",
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("No tienes permisos");
    });
  });

  describe("Manejo de errores", () => {
    it("debe manejar errores inesperados", async () => {
      const mockContext = {
        params: Promise.resolve({ id: "vehicle-doc-id" }),
      };

      vi.mocked(cookies).mockRejectedValue(new Error("Error inesperado"));

      const request = new Request("http://localhost/api/fleet/vehicle-doc-id/notes", {
        method: "POST",
        body: JSON.stringify({
          data: {
            content: "Test",
          },
        }),
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
