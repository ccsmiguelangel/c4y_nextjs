"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
import { Avatar, AvatarFallback } from "@/components_shadcn/ui/avatar";
import { Separator } from "@/components_shadcn/ui/separator";
import {
  ArrowLeft,
  User,
  Car,
  Bell,
  Upload,
  FileText,
  Trash2,
  Calendar,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { spacing, typography, commonClasses, colors, components } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import type { BillingRecordCard, BillingDocument, BillingStatus } from "@/validations/types";
import { toast } from "sonner";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "retrasado":
      return "text-red-600";
    case "pendiente":
      return "text-yellow-600";
    case "pagado":
      return "text-green-600";
    default:
      return "text-muted-foreground";
  }
};

const getAmountColor = (status: BillingStatus): string => {
  switch (status) {
    case "retrasado":
      return "text-red-600";
    case "pendiente":
      return "text-yellow-600";
    case "pagado":
      return "text-green-600";
    default:
      return "text-foreground";
  }
};

export default function BillingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<BillingRecordCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [status, setStatus] = useState<BillingStatus>("pendiente");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [documents, setDocuments] = useState<BillingDocument[]>([]);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/billing/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Registro de facturación no encontrado");
          return;
        }
        throw new Error("Error al cargar el registro");
      }
      const data = await response.json();
      const recordData = data.data as BillingRecordCard;
      setRecord(recordData);
      setStatus(recordData.status);
      setPaymentDate(recordData.paymentDate || "");
      setNotes(recordData.notes || "");
      setDocuments(recordData.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const backButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className="h-10 w-10 flex items-center justify-center rounded-full"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/billing-document/${documentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Error al eliminar el documento");
      }
      setDocuments(documents.filter((doc) => doc.id !== documentId));
      toast.success("Documento eliminado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el documento");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !record) return;

    try {
      setIsUploading(true);
      
      // First upload the file to Strapi
      const formData = new FormData();
      formData.append("files", file);
      
      const uploadResponse = await fetch("/api/strapi/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Error al subir el archivo");
      }

      const uploadData = await uploadResponse.json();
      const uploadedFileId = uploadData.data?.[0]?.id;

      if (!uploadedFileId) {
        throw new Error("No se pudo obtener el ID del archivo subido");
      }

      // Create the billing document
      const docResponse = await fetch(`/api/billing/${record.documentId}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            name: file.name,
            file: uploadedFileId,
          },
        }),
      });

      if (!docResponse.ok) {
        throw new Error("Error al crear el documento de facturación");
      }

      const docData = await docResponse.json();
      setDocuments([...documents, docData.data]);
      toast.success("Documento subido correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el documento");
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = "";
    }
  };

  const handleSaveChanges = async () => {
    if (!record) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/billing/${record.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            status,
            paymentDate: paymentDate || null,
            notes: notes || null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar los cambios");
      }

      toast.success("Cambios guardados correctamente");
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReminder = async () => {
    if (!record) return;

    try {
      const response = await fetch(`/api/billing/${record.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            remindersSent: (record.remindersSent || 0) + 1,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar el recordatorio");
      }

      setRecord({
        ...record,
        remindersSent: (record.remindersSent || 0) + 1,
      });
      toast.success("Recordatorio enviado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar el recordatorio");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Detalle del Pago" showFilterAction leftActions={backButton}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !record) {
    return (
      <AdminLayout title="Detalle del Pago" showFilterAction leftActions={backButton}>
        <Card className={commonClasses.card}>
          <CardContent className={spacing.card.padding}>
            <p className={`${typography.body.base} text-center`}>
              {error || "Pago no encontrado"}
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => router.back()}
            >
              Volver
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Detalle del Pago"
      showFilterAction
      leftActions={backButton}
    >
      <div className="flex flex-col gap-6 pb-24">
        {/* Información del Cliente */}
        <Card className={commonClasses.card}>
          <CardContent className={spacing.card.padding}>
            <div className={`flex items-center ${spacing.gap.medium}`}>
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-muted">
                  <User className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className={`${typography.body.large} font-bold`}>
                  {record.clientName || "Cliente no asignado"}
                </p>
                <p className={typography.body.small}>
                  Factura #{record.invoiceNumber}
                </p>
              </div>
            </div>
            {record.vehicleName && (
              <>
                <Separator className="my-4" />
                <div className={`flex items-center ${spacing.gap.base}`}>
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <p className={typography.body.base}>{record.vehicleName}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detalles del Pago */}
        <Card className={commonClasses.card}>
          <CardHeader className={spacing.card.header}>
            <CardTitle className={commonClasses.sectionTitle}>
              Detalles del Pago
            </CardTitle>
          </CardHeader>
          <CardContent className={spacing.card.content}>
            <div className={`flex flex-col ${spacing.gap.base}`}>
              <div className="flex items-center justify-between">
                <span className={typography.label}>Monto</span>
                <span className={`${typography.body.large} font-bold ${getAmountColor(record.status)}`}>
                  {record.amountLabel}
                </span>
              </div>
              {record.dueDate && (
                <div className="flex items-center justify-between">
                  <span className={typography.label}>Fecha de Vencimiento</span>
                  <span className={typography.body.base}>
                    {formatDate(record.dueDate)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="status" className={typography.label}>
                  Estado
                </Label>
                <Select value={status} onValueChange={(value) => setStatus(value as BillingStatus)}>
                  <SelectTrigger
                    id="status"
                    className={`w-1/2 ${components.input.base} ${getStatusColor(status)}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retrasado" className="text-red-600">
                      Retrasado
                    </SelectItem>
                    <SelectItem value="pendiente" className="text-yellow-600">
                      Pendiente
                    </SelectItem>
                    <SelectItem value="pagado" className="text-green-600">
                      Pagado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-date" className={typography.label}>
                  Fecha de Pago
                </Label>
                <div className="relative w-1/2">
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className={`${components.input.base} pr-10`}
                  />
                  <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              {record.remindersSent > 0 && (
                <div className="flex items-center justify-between">
                  <span className={typography.label}>Recordatorios enviados</span>
                  <span className={typography.body.base}>{record.remindersSent}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notas */}
        <Card className={commonClasses.card}>
          <CardContent className={spacing.card.padding}>
            <Label htmlFor="notes" className={`mb-2 block ${commonClasses.sectionTitle}`}>
              Notas
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añadir notas sobre el pago..."
              rows={3}
              className={components.input.base}
            />
          </CardContent>
        </Card>

        {/* Documentos Adjuntos */}
        <Card className={commonClasses.card}>
          <CardHeader className={spacing.card.header}>
            <CardTitle className={commonClasses.sectionTitle}>
              Documentos Adjuntos
            </CardTitle>
          </CardHeader>
          <CardContent className={spacing.card.content}>
            <div className={`flex flex-col ${spacing.gap.base}`}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between rounded-lg border bg-muted/50 p-3 ${components.input.base}`}
                >
                  <div className={`flex items-center ${spacing.gap.base}`}>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className={typography.body.base}>{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Label
                htmlFor="file-upload"
                className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 py-6 transition-colors hover:bg-muted/50 ${components.input.base} ${isUploading ? "pointer-events-none opacity-50" : ""}`}
              >
                <div className={`flex flex-col items-center justify-center ${spacing.gap.small}`}>
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-8 w-8 text-primary" />
                  )}
                  <p className={typography.body.base}>
                    {isUploading ? (
                      "Subiendo..."
                    ) : (
                      <>
                        <span className="font-semibold">Click para subir</span> o arrastrar
                      </>
                    )}
                  </p>
                  <p className={typography.body.small}>
                    PDF, PNG, JPG (max. 5MB)
                  </p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="sr-only"
                />
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card className={commonClasses.card}>
          <CardHeader className={spacing.card.header}>
            <CardTitle className={commonClasses.sectionTitle}>Acciones</CardTitle>
          </CardHeader>
          <CardContent className={spacing.card.content}>
            <Button
              variant="secondary"
              onClick={handleSendReminder}
              className={`w-full ${components.button.base} flex items-center justify-center ${spacing.gap.small}`}
            >
              <Bell className="h-4 w-4" />
              Enviar Recordatorio
            </Button>
          </CardContent>
        </Card>

        {/* Footer Fixed */}
        <footer className="fixed bottom-0 left-0 w-full border-t bg-background/80 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl px-6">
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={`w-full ${components.button.base} flex items-center justify-center py-3.5 text-base font-bold shadow-lg`}
              style={{
                boxShadow: `0 10px 15px -3px ${colors.primary}30, 0 4px 6px -2px ${colors.primary}20`,
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </footer>
      </div>
    </AdminLayout>
  );
}
