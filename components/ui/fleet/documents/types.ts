import type { FleetDocument, FleetDocumentType } from "@/validations/types";

export type { FleetDocument, FleetDocumentType };

export interface DocumentItemProps {
  document: FleetDocument;
  onDelete?: (documentId: number | string) => Promise<void>;
}

export interface FleetDocumentsProps {
  documents: FleetDocument[];
  isLoading?: boolean;
  onDelete?: (documentId: number | string) => Promise<void>;
  vehicleId: string;
  onAddClick?: () => void;
}

export const DOCUMENT_TYPE_LABELS: Record<FleetDocumentType, string> = {
  poliza_seguro: "Póliza de Seguro del Vehículo",
  ficha_tecnica: "Ficha Técnica del Vehículo",
  tarjeta_propiedad: "Tarjeta de Propiedad Vehicular",
  contrato_compraventa: "Contrato Compraventa",
  matricula_vehicular: "Matrícula Vehicular Vigente",
  certificado_revisado: "Certificado de Revisado Vehicular",
  otros: "Otros",
};


