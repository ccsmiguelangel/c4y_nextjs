"use client";

import { useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreVertical,
  User,
  Car,
  Bell,
  Upload,
  FileText,
  Trash2,
  Calendar,
} from "lucide-react";
import { spacing, typography, commonClasses, colors, components } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import { LogoutButton } from "@/components/ui/logout-button";

interface PaymentData {
  id: string;
  clientName: string;
  invoiceNumber: string;
  vehicle: string;
  amount: string;
  currency: string;
  dueDate: string;
  status: "retrasado" | "pendiente" | "pagado";
  paymentDate: string;
  notes: string;
  documents: Array<{
    id: string;
    name: string;
  }>;
}

const getPaymentData = (id: string): PaymentData | null => {
  const payments: Record<string, PaymentData> = {
    "1": {
      id: "1",
      clientName: "Ana López",
      invoiceNumber: "2024-015",
      vehicle: "Toyota Camry 2023",
      amount: "350.00",
      currency: "USD",
      dueDate: "2024-06-01",
      status: "retrasado",
      paymentDate: "2024-06-10",
      notes: "Cliente contactado el 05/06. Prometió pago para el 10/06.",
      documents: [
        {
          id: "1",
          name: "comprobante.pdf",
        },
      ],
    },
  };

  return payments[id] || null;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

export default function BillingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const paymentData = getPaymentData(id);
  const [status, setStatus] = useState<string>(paymentData?.status || "retrasado");
  const [paymentDate, setPaymentDate] = useState<string>(
    paymentData?.paymentDate || ""
  );
  const [notes, setNotes] = useState<string>(paymentData?.notes || "");
  const [documents, setDocuments] = useState<Array<{ id: string; name: string }>>(
    paymentData?.documents || []
  );

  if (!paymentData) {
    return (
      <AdminLayout title="Detalle del Pago" rightActions={<LogoutButton />}>
        <Card className={commonClasses.card}>
          <CardContent className={spacing.card.padding}>
            <p className={typography.body.base}>Pago no encontrado</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(documents.filter((doc) => doc.id !== documentId));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newDocument = {
        id: Date.now().toString(),
        name: file.name,
      };
      setDocuments([...documents, newDocument]);
    }
  };

  const handleSaveChanges = () => {
    // Aquí iría la lógica para guardar los cambios
    console.log("Guardando cambios...", { status, paymentDate, notes, documents });
    router.back();
  };

  const handleSendReminder = () => {
    // Aquí iría la lógica para enviar recordatorio
    console.log("Enviando recordatorio...");
  };

  return (
    <AdminLayout
      title="Detalle del Pago"
      leftActions={
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
      rightActions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[8rem]">
              <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" className="cursor-pointer">
                Eliminar Pago
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <LogoutButton />
        </>
      }
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
                      {paymentData.clientName}
                    </p>
                    <p className={typography.body.small}>
                      Factura #{paymentData.invoiceNumber}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className={`flex items-center ${spacing.gap.base}`}>
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <p className={typography.body.base}>{paymentData.vehicle}</p>
                </div>
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
                    <span className={`${typography.body.large} font-bold text-red-600`}>
                      $ {paymentData.amount} {paymentData.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={typography.label}>Fecha de Vencimiento</span>
                    <span className={typography.body.base}>
                      {formatDate(paymentData.dueDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="status" className={typography.label}>
                      Estado
                    </Label>
                    <Select value={status} onValueChange={setStatus}>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Label
                    htmlFor="file-upload"
                    className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 py-6 transition-colors hover:bg-muted/50 ${components.input.base}`}
                  >
                    <div className={`flex flex-col items-center justify-center ${spacing.gap.small}`}>
                      <Upload className="h-8 w-8 text-primary" />
                      <p className={typography.body.base}>
                        <span className="font-semibold">Click para subir</span> o arrastrar
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
                className={`w-full ${components.button.base} flex items-center justify-center py-3.5 text-base font-bold shadow-lg`}
                style={{
                  boxShadow: `0 10px 15px -3px ${colors.primary}30, 0 4px 6px -2px ${colors.primary}20`,
                }}
              >
                Guardar Cambios
              </Button>
            </div>
          </footer>
        </div>
      </AdminLayout>
    );
  }
