import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
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

describe("GET /api/user-profile/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Autenticación", () => {
    it("debe retornar 401 si no hay JWT en las cookies", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("No autenticado");
    });

    it("debe retornar 401 si el JWT es null", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: null }),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("No autenticado");
    });
  });

  describe("Obtención de usuario de Strapi", () => {
    it("debe retornar error si /api/users/me falla", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Unauthorized",
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("No se pudo obtener el usuario");
    });

    it("debe retornar error si la respuesta de Strapi no tiene userId", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "test@example.com" }), // Sin id
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Usuario no válido");
    });
  });

  describe("Obtención de user-profile existente", () => {
    it("debe retornar el documentId del user-profile existente", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de /api/users/me
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
          username: "testuser",
        }),
      } as Response);

      // Mock de búsqueda de user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "test-document-id",
              displayName: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.documentId).toBe("test-document-id");
    });

    it("debe retornar error si no se puede obtener el user-profile", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de /api/users/me
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
          username: "testuser",
        }),
      } as Response);

      // Mock de error al buscar user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Error interno",
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("No se pudo obtener el user-profile");
    });
  });

  describe("Creación automática de user-profile", () => {
    it("debe crear un user-profile si no existe", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de /api/users/me
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "newuser@example.com",
          username: "newuser",
        }),
      } as Response);

      // Mock de búsqueda de user-profile (no encontrado)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [], // No existe
        }),
      } as Response);

      // Mock de creación de user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            documentId: "new-document-id",
            displayName: "Newuser",
            email: "newuser@example.com",
          },
        }),
      } as Response);

      // Mock de obtención del perfil completo después de crear
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "new-document-id",
              displayName: "Newuser",
              email: "newuser@example.com",
            },
          ],
        }),
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.documentId).toBe("new-document-id");
      
      // Verificar que se llamó a crear el perfil
      expect(fetch).toHaveBeenCalledTimes(4);
      const createCall = vi.mocked(fetch).mock.calls[2];
      expect(createCall[0]).toBe("http://localhost:1337/api/user-profiles");
      expect(createCall[1]?.method).toBe("POST");
    });

    it("debe usar la parte antes del @ del email como displayName si username es email", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de /api/users/me con username que es un email
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "miguelangel@example.com",
          username: "miguelangel@example.com", // Username es email
        }),
      } as Response);

      // Mock de búsqueda de user-profile (no encontrado)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
        }),
      } as Response);

      // Mock de creación de user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            documentId: "new-doc-id",
            displayName: "Miguelangel",
            email: "miguelangel@example.com",
          },
        }),
      } as Response);

      // Mock de obtención del perfil completo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "new-doc-id",
              displayName: "Miguelangel",
              email: "miguelangel@example.com",
            },
          ],
        }),
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verificar que el displayName se creó correctamente
      const createCall = vi.mocked(fetch).mock.calls[2];
      const createBody = JSON.parse(createCall[1]?.body as string);
      expect(createBody.data.displayName).toBe("Miguelangel");
    });

    it("debe usar 'Usuario' como displayName si no hay username ni email válido", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de /api/users/me sin username ni email válido
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: null,
          username: null,
        }),
      } as Response);

      // Mock de búsqueda de user-profile (no encontrado)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
        }),
      } as Response);

      // Mock de creación de user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            documentId: "new-doc-id",
            displayName: "Usuario",
          },
        }),
      } as Response);

      // Mock de obtención del perfil completo
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "new-doc-id",
              displayName: "Usuario",
            },
          ],
        }),
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verificar que el displayName es "Usuario"
      const createCall = vi.mocked(fetch).mock.calls[2];
      const createBody = JSON.parse(createCall[1]?.body as string);
      expect(createBody.data.displayName).toBe("Usuario");
    });

    it("debe retornar error si falla la creación del user-profile", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de /api/users/me
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
          username: "testuser",
        }),
      } as Response);

      // Mock de búsqueda de user-profile (no encontrado)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
        }),
      } as Response);

      // Mock de error al crear user-profile
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Error al crear",
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("No se pudo crear el user-profile");
    });

    it("debe retornar error si el user-profile creado no tiene documentId", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-jwt" }),
      } as any);

      // Mock de /api/users/me
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: "test@example.com",
          username: "testuser",
        }),
      } as Response);

      // Mock de búsqueda de user-profile (no encontrado)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
        }),
      } as Response);

      // Mock de creación de user-profile sin documentId
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            // Sin documentId
            displayName: "Test User",
            email: "test@example.com",
          },
        }),
      } as Response);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("User-profile creado pero sin documentId");
    });
  });

  describe("Manejo de errores", () => {
    it("debe manejar errores inesperados", async () => {
      vi.mocked(cookies).mockRejectedValue(new Error("Error inesperado"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error al obtener el user-profile");
    });
  });
});
