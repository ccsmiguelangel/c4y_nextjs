import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock del módulo config para evitar errores de variables de entorno
vi.mock("@/lib/config", () => ({
  STRAPI_BASE_URL: "http://localhost:1337",
  STRAPI_API_TOKEN: "test-token",
}));

// Importar después de los mocks
import {
  fetchAppointmentsFromStrapi,
  fetchAppointmentByIdFromStrapi,
  createAppointmentInStrapi,
  updateAppointmentInStrapi,
  deleteAppointmentInStrapi,
} from "@/lib/calendar";

describe("Calendar CRUD - Strapi Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchAppointmentsFromStrapi (READ - Lista)", () => {
    it("debe obtener la lista de citas correctamente", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-1",
            title: "Cita de Prueba",
            type: "prueba",
            status: "confirmada",
            scheduledAt: "2024-10-05T09:00:00.000Z",
            description: "Prueba de conducción SUV",
            price: 0,
            client: {
              id: 1,
              documentId: "client-1",
              fullName: "Carlos Rodriguez",
              email: "carlos@example.com",
              phone: "+34 612 345 678",
            },
            vehicle: {
              id: 1,
              documentId: "vehicle-1",
              name: "SUV Eléctrico",
              placa: "ABC123",
            },
          },
          {
            id: 2,
            documentId: "apt-2",
            type: "venta",
            status: "pendiente",
            scheduledAt: "2024-10-05T11:30:00.000Z",
            description: "Venta Sedán Híbrido",
            price: 42500,
            client: {
              id: 2,
              documentId: "client-2",
              fullName: "Laura Gómez",
              email: "laura@example.com",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("prueba");
      expect(result[0].typeLabel).toBe("Prueba de Conducción");
      expect(result[0].status).toBe("confirmada");
      expect(result[0].statusLabel).toBe("Confirmada");
      expect(result[0].clientName).toBe("Carlos Rodriguez");
      expect(result[0].vehicleName).toBe("SUV Eléctrico");
      expect(result[0].time).toBe("09:00");
      expect(result[0].period).toBe("AM");
      expect(result[1].type).toBe("venta");
      expect(result[1].typeLabel).toBe("Venta");
      expect(result[1].status).toBe("pendiente");
    });

    it("debe extraer correctamente la hora y periodo", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-1",
            type: "mantenimiento",
            status: "pendiente",
            scheduledAt: "2024-10-05T14:30:00.000Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result[0].time).toBe("02:30");
      expect(result[0].period).toBe("PM");
    });

    it("debe extraer correctamente el día, mes y año", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-1",
            type: "venta",
            status: "confirmada",
            scheduledAt: "2024-10-15T10:00:00.000Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result[0].day).toBe(15);
      expect(result[0].month).toBe(9); // Octubre es mes 9 (0-indexed)
      expect(result[0].year).toBe(2024);
    });

    it("debe retornar array vacío cuando no hay citas", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result).toHaveLength(0);
    });

    it("debe lanzar error cuando la petición falla", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(fetchAppointmentsFromStrapi()).rejects.toThrow(
        "Strapi Appointments request failed with status 500"
      );
    });
  });

  describe("fetchAppointmentByIdFromStrapi (READ - Individual)", () => {
    it("debe obtener una cita por ID correctamente", async () => {
      const mockAppointment = {
        data: [
          {
            id: 1,
            documentId: "apt-1",
            title: "Cita de Prueba",
            type: "prueba",
            status: "confirmada",
            scheduledAt: "2024-10-05T09:00:00.000Z",
            description: "Prueba de conducción SUV",
            notes: "Cliente interesado en modelo eléctrico",
            location: "Concesionario Central",
            contactPhone: "+34 612 345 678",
            contactEmail: "carlos@example.com",
            client: {
              id: 1,
              documentId: "client-1",
              fullName: "Carlos Rodriguez",
            },
            vehicle: {
              id: 1,
              documentId: "vehicle-1",
              name: "SUV Eléctrico",
              placa: "ABC123",
            },
            assignedTo: {
              id: 1,
              documentId: "user-1",
              displayName: "Juan Vendedor",
              email: "juan@empresa.com",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointment,
      });

      const result = await fetchAppointmentByIdFromStrapi("apt-1");

      expect(result).not.toBeNull();
      expect(result?.type).toBe("prueba");
      expect(result?.documentId).toBe("apt-1");
      expect(result?.clientName).toBe("Carlos Rodriguez");
      expect(result?.vehicleName).toBe("SUV Eléctrico");
      expect(result?.vehiclePlaca).toBe("ABC123");
      expect(result?.assignedToName).toBe("Juan Vendedor");
      expect(result?.location).toBe("Concesionario Central");
      expect(result?.notes).toBe("Cliente interesado en modelo eléctrico");
    });

    it("debe retornar null cuando la cita no existe", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await fetchAppointmentByIdFromStrapi("non-existent");

      expect(result).toBeNull();
    });

    it("debe retornar null cuando recibe 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchAppointmentByIdFromStrapi("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createAppointmentInStrapi (CREATE)", () => {
    it("debe crear una cita correctamente", async () => {
      const newAppointment = {
        type: "prueba" as const,
        status: "pendiente" as const,
        scheduledAt: "2024-10-10T10:00:00.000Z",
        description: "Nueva prueba de conducción",
      };

      const mockResponse = {
        data: {
          id: 3,
          documentId: "new-apt-id",
          ...newAppointment,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createAppointmentInStrapi(newAppointment);

      expect(result.type).toBe("prueba");
      expect(result.typeLabel).toBe("Prueba de Conducción");
      expect(result.documentId).toBe("new-apt-id");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/appointments"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("debe lanzar error cuando la creación falla", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(
        createAppointmentInStrapi({
          type: "prueba",
          scheduledAt: "2024-10-10T10:00:00.000Z",
        })
      ).rejects.toThrow("Strapi Appointment create failed");
    });
  });

  describe("updateAppointmentInStrapi (UPDATE)", () => {
    it("debe actualizar una cita correctamente usando documentId", async () => {
      const updatedData = {
        data: {
          id: 1,
          documentId: "apt-1",
          type: "prueba",
          status: "confirmada",
          scheduledAt: "2024-10-05T09:00:00.000Z",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedData,
      });

      const result = await updateAppointmentInStrapi("apt-1", {
        status: "confirmada",
      });

      expect(result.status).toBe("confirmada");
      expect(result.statusLabel).toBe("Confirmada");
    });

    it("debe actualizar una cita usando ID numérico", async () => {
      // Para IDs numéricos, primero se busca el documentId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "apt-doc-1",
              type: "venta",
              status: "pendiente",
              scheduledAt: "2024-10-05T10:00:00.000Z",
            },
          ],
        }),
      });

      // Luego se hace la actualización
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            documentId: "apt-doc-1",
            type: "venta",
            status: "confirmada",
            scheduledAt: "2024-10-05T10:00:00.000Z",
          },
        }),
      });

      const result = await updateAppointmentInStrapi(1, {
        status: "confirmada",
      });

      expect(result.status).toBe("confirmada");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("debe lanzar error cuando la cita no existe (ID numérico)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(
        updateAppointmentInStrapi(999, { status: "confirmada" })
      ).rejects.toThrow("No pudimos encontrar la cita");
    });
  });

  describe("deleteAppointmentInStrapi (DELETE)", () => {
    it("debe eliminar una cita correctamente usando documentId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(
        deleteAppointmentInStrapi("apt-to-delete")
      ).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/appointments/apt-to-delete"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("debe eliminar una cita usando ID numérico", async () => {
      // Para IDs numéricos, primero se resuelve el documentId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "apt-doc-1",
              type: "prueba",
              status: "pendiente",
              scheduledAt: "2024-10-05T09:00:00.000Z",
            },
          ],
        }),
      });

      // Luego se hace el DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(deleteAppointmentInStrapi(1)).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("debe lanzar error cuando la cita no existe (ID numérico)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(deleteAppointmentInStrapi(999)).rejects.toThrow(
        "No pudimos encontrar la cita"
      );
    });

    it("debe lanzar error cuando la eliminación falla", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(deleteAppointmentInStrapi("apt-1")).rejects.toThrow(
        "Strapi Appointment delete failed"
      );
    });
  });

  describe("Normalización de datos", () => {
    it("debe normalizar correctamente citas con estructura attributes", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            attributes: {
              documentId: "apt-attrs",
              type: "mantenimiento",
              status: "confirmada",
              scheduledAt: "2024-10-05T14:00:00.000Z",
              price: 350,
              client: {
                data: {
                  id: 1,
                  documentId: "client-1",
                  attributes: {
                    fullName: "Cliente Attrs",
                    email: "attrs@test.com",
                  },
                },
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("mantenimiento");
      expect(result[0].typeLabel).toBe("Mantenimiento");
      expect(result[0].status).toBe("confirmada");
      expect(result[0].statusLabel).toBe("Confirmada");
      expect(result[0].clientName).toBe("Cliente Attrs");
      expect(result[0].price).toBe(350);
    });

    it("debe manejar citas sin campos opcionales", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "minimal-apt",
            type: "prueba",
            status: "pendiente",
            scheduledAt: "2024-10-05T10:00:00.000Z",
            // Sin client, vehicle, price, notes, location, etc.
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result).toHaveLength(1);
      expect(result[0].clientName).toBeUndefined();
      expect(result[0].vehicleName).toBeUndefined();
      expect(result[0].price).toBeUndefined();
      expect(result[0].notes).toBeUndefined();
      expect(result[0].location).toBeUndefined();
    });

    it("debe filtrar citas sin tipo o scheduledAt", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "valid-apt",
            type: "prueba",
            status: "pendiente",
            scheduledAt: "2024-10-05T10:00:00.000Z",
          },
          {
            id: 2,
            documentId: "invalid-apt-no-type",
            type: "", // Tipo vacío
            status: "pendiente",
            scheduledAt: "2024-10-05T11:00:00.000Z",
          },
          {
            id: 3,
            documentId: "invalid-apt-no-date",
            type: "venta",
            status: "pendiente",
            scheduledAt: "", // Fecha vacía
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("prueba");
    });

    it("debe formatear correctamente el precio", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-price",
            type: "venta",
            status: "pendiente",
            scheduledAt: "2024-10-05T10:00:00.000Z",
            price: 42500,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result[0].price).toBe(42500);
      expect(result[0].priceLabel).toBeDefined();
    });

    it("debe usar contactPhone/contactEmail cuando no hay relación client", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-contact",
            type: "prueba",
            status: "pendiente",
            scheduledAt: "2024-10-05T10:00:00.000Z",
            contactPhone: "+34 600 000 000",
            contactEmail: "contact@test.com",
            // Sin relación client
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result[0].contactPhone).toBe("+34 600 000 000");
      expect(result[0].contactEmail).toBe("contact@test.com");
    });

    it("debe normalizar todas las relaciones correctamente", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-full",
            type: "venta",
            status: "confirmada",
            scheduledAt: "2024-10-05T10:00:00.000Z",
            client: {
              id: 1,
              documentId: "client-1",
              fullName: "Test Client",
              email: "client@test.com",
              phone: "+34 611 111 111",
            },
            vehicle: {
              id: 2,
              documentId: "vehicle-1",
              name: "Test Vehicle",
              placa: "XYZ789",
            },
            assignedTo: {
              id: 3,
              documentId: "user-1",
              displayName: "Test User",
              email: "user@test.com",
            },
            deal: {
              id: 4,
              documentId: "deal-1",
              title: "Test Deal",
            },
            serviceOrder: {
              id: 5,
              documentId: "so-1",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result[0].clientName).toBe("Test Client");
      expect(result[0].clientEmail).toBe("client@test.com");
      expect(result[0].clientPhone).toBe("+34 611 111 111");
      expect(result[0].clientDocumentId).toBe("client-1");
      expect(result[0].vehicleName).toBe("Test Vehicle");
      expect(result[0].vehiclePlaca).toBe("XYZ789");
      expect(result[0].vehicleDocumentId).toBe("vehicle-1");
      expect(result[0].assignedToName).toBe("Test User");
      expect(result[0].assignedToEmail).toBe("user@test.com");
      expect(result[0].assignedToDocumentId).toBe("user-1");
      expect(result[0].dealTitle).toBe("Test Deal");
      expect(result[0].dealDocumentId).toBe("deal-1");
      expect(result[0].serviceOrderDocumentId).toBe("so-1");
    });
  });

  describe("Tipos de citas", () => {
    it("debe asignar labels correctos para cada tipo", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-prueba",
            type: "prueba",
            status: "pendiente",
            scheduledAt: "2024-10-05T10:00:00.000Z",
          },
          {
            id: 2,
            documentId: "apt-venta",
            type: "venta",
            status: "pendiente",
            scheduledAt: "2024-10-05T11:00:00.000Z",
          },
          {
            id: 3,
            documentId: "apt-mantenimiento",
            type: "mantenimiento",
            status: "pendiente",
            scheduledAt: "2024-10-05T12:00:00.000Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result[0].typeLabel).toBe("Prueba de Conducción");
      expect(result[1].typeLabel).toBe("Venta");
      expect(result[2].typeLabel).toBe("Mantenimiento");
    });
  });

  describe("Estados de citas", () => {
    it("debe asignar labels correctos para cada estado", async () => {
      const mockAppointments = {
        data: [
          {
            id: 1,
            documentId: "apt-confirmada",
            type: "prueba",
            status: "confirmada",
            scheduledAt: "2024-10-05T10:00:00.000Z",
          },
          {
            id: 2,
            documentId: "apt-pendiente",
            type: "venta",
            status: "pendiente",
            scheduledAt: "2024-10-05T11:00:00.000Z",
          },
          {
            id: 3,
            documentId: "apt-cancelada",
            type: "mantenimiento",
            status: "cancelada",
            scheduledAt: "2024-10-05T12:00:00.000Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      });

      const result = await fetchAppointmentsFromStrapi();

      expect(result[0].statusLabel).toBe("Confirmada");
      expect(result[1].statusLabel).toBe("Pendiente");
      expect(result[2].statusLabel).toBe("Cancelada");
    });
  });
});
