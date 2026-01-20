"use client";

import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components_shadcn/ui/dropdown-menu";
import {
  CreditCard,
  Bell,
  Receipt,
  Edit,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { commonClasses, spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import type { BillingRecordCard, BillingStatus } from "@/validations/types";
import { toast } from "sonner";
import {
  CreateBillingDialog,
  initialBillingFormData,
  validateBillingForm,
  type CreateBillingFormData,
} from "./components/billing-dialogs";

const getStatusBadge = (status: BillingStatus) => {
  switch (status) {
    case "pagado":
      return (
        <Badge className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
          <Receipt className="h-3 w-3" />
          Pagado
        </Badge>
      );
    case "pendiente":
      return (
        <Badge className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
          Pendiente
        </Badge>
      );
    case "retrasado":
      return (
        <Badge className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/50 dark:text-red-300">
          Retrasado
        </Badge>
      );
  }
};

const getAmountColor = (status: BillingStatus) => {
  switch (status) {
    case "pagado":
      return "text-green-600";
    case "pendiente":
      return "text-yellow-600";
    case "retrasado":
      return "text-red-600";
  }
};

const getActionButton = (status: BillingStatus, onClick: (e: React.MouseEvent) => void) => {
  switch (status) {
    case "pagado":
      return (
        <Button
          variant="ghost"
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80"
        >
          <Receipt className="h-3.5 w-3.5" />
          Ver Recibo
        </Button>
      );
    case "pendiente":
      return (
        <Button
          variant="ghost"
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80"
        >
          <Edit className="h-3.5 w-3.5" />
          Marcar como Pagado
        </Button>
      );
    case "retrasado":
      return (
        <Button
          variant="ghost"
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80"
        >
          <Bell className="h-3.5 w-3.5" />
          Enviar Recordatorio
        </Button>
      );
  }
};

const getDateLabel = (record: BillingRecordCard): { label: string; date: string } => {
  if (record.status === "pagado" && record.paymentDateLabel) {
    return { label: "Pagado:", date: record.paymentDateLabel };
  }
  if (record.dueDateLabel) {
    return { label: "Vence:", date: record.dueDateLabel };
  }
  return { label: "", date: "" };
};

export default function BillingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [records, setRecords] = useState<BillingRecordCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del modal de crear pago
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateBillingFormData>(initialBillingFormData);
  const [isCreating, setIsCreating] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/billing");
      if (!response.ok) {
        throw new Error("Error al cargar los registros de facturación");
      }
      const data = await response.json();
      setRecords(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleCreatePayment = async () => {
    try {
      setIsCreating(true);
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            invoiceNumber: createFormData.invoiceNumber,
            amount: parseFloat(createFormData.amount),
            currency: createFormData.currency,
            status: createFormData.status,
            dueDate: createFormData.dueDate || null,
            paymentDate: createFormData.paymentDate || null,
            notes: createFormData.notes || null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el pago");
      }

      toast.success("Pago registrado correctamente");
      setIsCreateDialogOpen(false);
      setCreateFormData(initialBillingFormData);
      fetchRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar el pago");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreateDialogOpen(false);
    setCreateFormData(initialBillingFormData);
  };

  const isFormValid = validateBillingForm(createFormData);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      (record.clientName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      record.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || record.status === statusFilter;
    
    // Filtro por fecha
    let matchesDate = true;
    if (dateFilter && record.dueDate) {
      // La fecha viene en formato ISO, comparar directamente
      matchesDate = record.dueDate === dateFilter;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <AdminLayout
      title="Gestión de Pagos"
      showFilterAction
    >
      {/* Botón de Registrar Pago */}
      <div className="px-0">
        <Button
          className="w-full rounded-lg bg-primary h-12 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <CreditCard className="h-5 w-5" />
          Registrar Pago Manual
        </Button>
      </div>

      {/* Modal de Crear Pago */}
      <CreateBillingDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={createFormData}
        setFormData={setCreateFormData}
        isCreating={isCreating}
        isFormValid={isFormValid}
        onConfirm={handleCreatePayment}
        onCancel={handleCancelCreate}
      />

      {/* Filtros */}
      <div className={`flex flex-col ${spacing.gap.small} px-0`}>
        <SearchInput
          variant="muted"
          placeholder="Buscar por cliente, factura..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className={`flex ${spacing.gap.small}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                suppressHydrationWarning
                className={`h-8 flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                  statusFilter !== "all" ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                }`}
              >
                <span className={typography.body.base}>Estado</span>
                {statusFilter !== "all" && (
                  <>
                    <span className="ml-1 shrink-0">·</span>
                    <span className="shrink-0 capitalize">{statusFilter}</span>
                  </>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100] rounded-none">
              <DropdownMenuLabel className="bg-muted">Seleccionar Estado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("all")} className="bg-muted hover:bg-muted focus:bg-muted rounded-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
                Todos los estados
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("pagado")} className="bg-muted hover:bg-muted focus:bg-muted rounded-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
                Pagado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pendiente")} className="bg-muted hover:bg-muted focus:bg-muted rounded-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
                Pendiente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("retrasado")} className="bg-muted hover:bg-muted focus:bg-muted rounded-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
                Retrasado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1 relative">
            <Input
              type="date"
              suppressHydrationWarning
              className="flex-1 h-8 rounded-lg bg-muted border-none pr-8 dark:[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-8 w-8 rounded-lg hover:bg-muted/80"
                onClick={() => setDateFilter("")}
              >
                <X className="h-4 w-4 text-muted-foreground dark:text-white" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Estado de error */}
      {error && !isLoading && (
        <Card className={commonClasses.card}>
          <CardContent className={spacing.card.padding}>
            <p className="text-center text-red-600">{error}</p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={fetchRecords}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Estado vacío */}
      {!isLoading && !error && filteredRecords.length === 0 && (
        <Card className={commonClasses.card}>
          <CardContent className={spacing.card.padding}>
            <p className="text-center text-muted-foreground">
              {records.length === 0
                ? "No hay registros de facturación"
                : "No se encontraron registros con los filtros aplicados"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de Pagos */}
      {!isLoading && !error && filteredRecords.length > 0 && (
        <div className={`flex flex-col ${spacing.gap.medium} px-0`}>
          {filteredRecords.map((record) => {
            const dateInfo = getDateLabel(record);
            return (
              <Card
                key={record.id}
                className={`${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
                onClick={() => router.push(`/billing/details/${record.documentId}`)}
              >
                <CardContent className={spacing.card.padding}>
                  <div className={`flex items-start justify-between ${spacing.gap.base}`}>
                    <div className="flex flex-col">
                      <p className={`${typography.body.large} font-bold`}>
                        {record.clientName || "Cliente no asignado"}
                      </p>
                      <p className={typography.body.base}>
                        Factura #{record.invoiceNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`${typography.metric.base} font-bold ${getAmountColor(record.status)}`}
                      >
                        {record.amountLabel}
                      </p>
                      <div className="mt-1">{getStatusBadge(record.status)}</div>
                    </div>
                  </div>
                  <div
                    className={`mt-4 flex items-center justify-between ${typography.body.base}`}
                  >
                    <p className={typography.body.small}>
                      {dateInfo.label} {dateInfo.date}
                    </p>
                    {getActionButton(record.status, (e) => {
                      e.stopPropagation();
                      router.push(`/billing/details/${record.documentId}`);
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
