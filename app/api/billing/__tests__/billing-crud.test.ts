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
  fetchBillingRecordsFromStrapi,
  fetchBillingRecordByIdFromStrapi,
  createBillingRecordInStrapi,
  updateBillingRecordInStrapi,
  deleteBillingRecordInStrapi,
  createBillingDocumentInStrapi,
  deleteBillingDocumentInStrapi,
} from "@/lib/billing";

describe("Billing CRUD - Strapi Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchBillingRecordsFromStrapi (READ - Lista)", () => {
    it("debe obtener la lista de registros de facturación correctamente", async () => {
      const mockRecords = {
        data: [
          {
            id: 1,
            documentId: "bill-1",
            invoiceNumber: "2024-001",
            amount: 350.5,
            currency: "USD",
            status: "pendiente",
            dueDate: "2024-06-15",
            notes: "Pago pendiente",
            remindersSent: 0,
            client: {
              id: 1,
              documentId: "client-1",
              fullName: "Ana López",
              email: "ana@example.com",
            },
            vehicle: {
              id: 1,
              documentId: "vehicle-1",
              name: "Toyota Camry 2023",
            },
            documents: [],
          },
          {
            id: 2,
            documentId: "bill-2",
            invoiceNumber: "2024-002",
            amount: 500.0,
            currency: "USD",
            status: "pagado",
            dueDate: "2024-06-01",
            paymentDate: "2024-06-02",
            remindersSent: 1,
            client: {
              id: 2,
              documentId: "client-2",
              fullName: "Jorge Martinez",
              email: "jorge@example.com",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecords,
      });

      const result = await fetchBillingRecordsFromStrapi();

      expect(result).toHaveLength(2);
      expect(result[0].invoiceNumber).toBe("2024-001");
      expect(result[0].amount).toBe(350.5);
      expect(result[0].status).toBe("pendiente");
      expect(result[0].clientName).toBe("Ana López");
      expect(result[0].vehicleName).toBe("Toyota Camry 2023");
      expect(result[1].invoiceNumber).toBe("2024-002");
      expect(result[1].status).toBe("pagado");
    });

    it("debe formatear correctamente las fechas", async () => {
      const mockRecords = {
        data: [
          {
            id: 1,
            documentId: "bill-1",
            invoiceNumber: "2024-001",
            amount: 100,
            status: "pendiente",
            dueDate: "2024-06-15",
            paymentDate: "2024-06-20",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecords,
      });

      const result = await fetchBillingRecordsFromStrapi();

      // Verificar que las fechas se formatean correctamente (dd/mm/yyyy)
      // Nota: La fecha puede variar ligeramente por zona horaria
      expect(result[0].dueDateLabel).toMatch(/^\d{2}\/06\/2024$/);
      expect(result[0].paymentDateLabel).toMatch(/^\d{2}\/06\/2024$/);
    });

    it("debe retornar array vacío cuando no hay registros", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await fetchBillingRecordsFromStrapi();

      expect(result).toHaveLength(0);
    });

    it("debe lanzar error cuando la petición falla", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(fetchBillingRecordsFromStrapi()).rejects.toThrow(
        "Strapi Billing request failed with status 500"
      );
    });
  });

  describe("fetchBillingRecordByIdFromStrapi (READ - Individual)", () => {
    it("debe obtener un registro por ID correctamente", async () => {
      const mockRecord = {
        data: [
          {
            id: 1,
            documentId: "bill-1",
            invoiceNumber: "2024-001",
            amount: 350.5,
            currency: "USD",
            status: "pendiente",
            dueDate: "2024-06-15",
            client: {
              id: 1,
              documentId: "client-1",
              fullName: "Ana López",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecord,
      });

      const result = await fetchBillingRecordByIdFromStrapi("bill-1");

      expect(result).not.toBeNull();
      expect(result?.invoiceNumber).toBe("2024-001");
      expect(result?.documentId).toBe("bill-1");
      expect(result?.clientName).toBe("Ana López");
    });

    it("debe retornar null cuando el registro no existe", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await fetchBillingRecordByIdFromStrapi("non-existent");

      expect(result).toBeNull();
    });

    it("debe retornar null cuando recibe 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchBillingRecordByIdFromStrapi("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createBillingRecordInStrapi (CREATE)", () => {
    it("debe crear un registro correctamente", async () => {
      const newRecord = {
        invoiceNumber: "2024-003",
        amount: 275.0,
        status: "pendiente" as const,
        dueDate: "2024-07-01",
      };

      const mockResponse = {
        data: {
          id: 3,
          documentId: "new-bill-id",
          ...newRecord,
          currency: "USD",
          remindersSent: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createBillingRecordInStrapi(newRecord);

      expect(result.invoiceNumber).toBe("2024-003");
      expect(result.amount).toBe(275.0);
      expect(result.documentId).toBe("new-bill-id");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing-records"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("debe asignar valores por defecto correctamente", async () => {
      const newRecord = {
        invoiceNumber: "2024-004",
        amount: 100,
      };

      const mockResponse = {
        data: {
          id: 4,
          documentId: "new-bill-4",
          ...newRecord,
          status: "pendiente",
          currency: "USD",
          remindersSent: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createBillingRecordInStrapi(newRecord);

      expect(result.status).toBe("pendiente");
      expect(result.currency).toBe("USD");
      expect(result.remindersSent).toBe(0);
    });

    it("debe lanzar error cuando la creación falla", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(
        createBillingRecordInStrapi({
          invoiceNumber: "TEST",
          amount: 100,
        })
      ).rejects.toThrow("Strapi Billing create failed");
    });
  });

  describe("updateBillingRecordInStrapi (UPDATE)", () => {
    it("debe actualizar un registro correctamente usando documentId", async () => {
      const updatedData = {
        data: {
          id: 1,
          documentId: "bill-1",
          invoiceNumber: "2024-001",
          amount: 400.0,
          status: "pagado",
          currency: "USD",
          remindersSent: 2,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedData,
      });

      const result = await updateBillingRecordInStrapi("bill-1", {
        amount: 400.0,
        status: "pagado",
      });

      expect(result.amount).toBe(400.0);
      expect(result.status).toBe("pagado");
    });

    it("debe actualizar un registro usando ID numérico", async () => {
      // Para IDs numéricos, primero se busca el documentId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "bill-doc-1",
              invoiceNumber: "2024-001",
              amount: 350,
              status: "pendiente",
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
            documentId: "bill-doc-1",
            invoiceNumber: "2024-001",
            amount: 350,
            status: "pagado",
            currency: "USD",
            remindersSent: 0,
          },
        }),
      });

      const result = await updateBillingRecordInStrapi(1, {
        status: "pagado",
      });

      expect(result.status).toBe("pagado");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("debe lanzar error cuando el registro no existe (ID numérico)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(
        updateBillingRecordInStrapi(999, { status: "pagado" })
      ).rejects.toThrow("No pudimos encontrar el registro de facturación");
    });
  });

  describe("deleteBillingRecordInStrapi (DELETE)", () => {
    it("debe eliminar un registro correctamente usando documentId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(
        deleteBillingRecordInStrapi("bill-to-delete")
      ).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing-records/bill-to-delete"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("debe eliminar un registro usando ID numérico", async () => {
      // Para IDs numéricos, primero se resuelve el documentId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "bill-doc-1",
              invoiceNumber: "2024-001",
              amount: 100,
              status: "pendiente",
            },
          ],
        }),
      });

      // Luego se hace el DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(deleteBillingRecordInStrapi(1)).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("debe lanzar error cuando el registro no existe (ID numérico)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(deleteBillingRecordInStrapi(999)).rejects.toThrow(
        "No pudimos encontrar el registro de facturación"
      );
    });

    it("debe lanzar error cuando la eliminación falla", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(deleteBillingRecordInStrapi("bill-1")).rejects.toThrow(
        "Strapi Billing delete failed"
      );
    });
  });

  describe("Billing Documents CRUD", () => {
    it("debe crear un documento de facturación correctamente", async () => {
      const mockResponse = {
        data: {
          id: 1,
          documentId: "doc-1",
          name: "comprobante.pdf",
          file: {
            url: "/uploads/comprobante.pdf",
            mime: "application/pdf",
            size: 1024,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createBillingDocumentInStrapi({
        name: "comprobante.pdf",
        file: 1,
        record: "bill-1",
      });

      expect(result.name).toBe("comprobante.pdf");
      expect(result.documentId).toBe("doc-1");
    });

    it("debe eliminar un documento de facturación correctamente", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(
        deleteBillingDocumentInStrapi("doc-to-delete")
      ).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing-documents/doc-to-delete"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("Normalización de datos", () => {
    it("debe normalizar correctamente registros con estructura attributes", async () => {
      const mockRecords = {
        data: [
          {
            id: 1,
            attributes: {
              documentId: "bill-attrs",
              invoiceNumber: "2024-ATTR",
              amount: 500,
              status: "pendiente",
              currency: "EUR",
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
        json: async () => mockRecords,
      });

      const result = await fetchBillingRecordsFromStrapi();

      expect(result).toHaveLength(1);
      expect(result[0].invoiceNumber).toBe("2024-ATTR");
      expect(result[0].currency).toBe("EUR");
      expect(result[0].clientName).toBe("Cliente Attrs");
    });

    it("debe manejar registros sin campos opcionales", async () => {
      const mockRecords = {
        data: [
          {
            id: 1,
            documentId: "minimal-bill",
            invoiceNumber: "2024-MIN",
            amount: 100,
            status: "pendiente",
            // Sin client, vehicle, dueDate, paymentDate, notes, documents
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecords,
      });

      const result = await fetchBillingRecordsFromStrapi();

      expect(result).toHaveLength(1);
      expect(result[0].clientName).toBeUndefined();
      expect(result[0].vehicleName).toBeUndefined();
      expect(result[0].dueDate).toBeUndefined();
      expect(result[0].notes).toBeUndefined();
      expect(result[0].documents).toEqual([]);
      expect(result[0].currency).toBe("USD"); // Valor por defecto
    });

    it("debe filtrar registros sin número de factura", async () => {
      const mockRecords = {
        data: [
          {
            id: 1,
            documentId: "valid-bill",
            invoiceNumber: "2024-VALID",
            amount: 100,
            status: "pendiente",
          },
          {
            id: 2,
            documentId: "invalid-bill",
            invoiceNumber: "", // Número de factura vacío
            amount: 200,
            status: "pendiente",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecords,
      });

      const result = await fetchBillingRecordsFromStrapi();

      expect(result).toHaveLength(1);
      expect(result[0].invoiceNumber).toBe("2024-VALID");
    });

    it("debe normalizar documentos correctamente", async () => {
      const mockRecords = {
        data: [
          {
            id: 1,
            documentId: "bill-with-docs",
            invoiceNumber: "2024-DOCS",
            amount: 100,
            status: "pendiente",
            documents: [
              {
                id: 1,
                documentId: "doc-1",
                name: "factura.pdf",
                file: {
                  url: "/uploads/factura.pdf",
                  mime: "application/pdf",
                  size: 2048,
                },
              },
              {
                id: 2,
                documentId: "doc-2",
                name: "comprobante.jpg",
                file: {
                  url: "/uploads/comprobante.jpg",
                  mime: "image/jpeg",
                  size: 1024,
                },
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecords,
      });

      const result = await fetchBillingRecordsFromStrapi();

      expect(result[0].documents).toHaveLength(2);
      expect(result[0].documents[0].name).toBe("factura.pdf");
      expect(result[0].documents[0].url).toBe("/uploads/factura.pdf");
      expect(result[0].documents[1].name).toBe("comprobante.jpg");
    });
  });
});
