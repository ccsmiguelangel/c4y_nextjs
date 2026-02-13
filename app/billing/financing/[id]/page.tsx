"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Car,
  User,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  Edit,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Badge } from "@/components_shadcn/ui/badge";
import { Progress } from "@/components_shadcn/ui/progress";
import { Separator } from "@/components_shadcn/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components_shadcn/ui/alert-dialog";

// Layout & Design
import { AdminLayout } from "@/components/admin/admin-layout";
import { typography, spacing, components } from "@/lib/design-system";
import { cn } from "@/lib/utils";

// Components
import { FinancingCalculator } from "@/components/ui/billing";
import { PaymentTimeline, type PaymentRecord } from "../../components/payment-timeline";
import { CreatePaymentDialog } from "../../components/create-payment-dialog";

// Types
import type { FinancingCard } from "@/lib/financing";
import type { BillingRecordCard } from "@/lib/billing";

type FinancingStatus = "activo" | "inactivo" | "en_mora" | "completado";

const statusConfig: Record<FinancingStatus, {
  label: string;
  icon: typeof CheckCircle2;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  activo: {
    label: "Activo",
    icon: CheckCircle2,
    bgColor: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
  },
  inactivo: {
    label: "Inactivo",
    icon: XCircle,
    bgColor: "bg-gray-50 dark:bg-gray-950/30",
    textColor: "text-gray-700 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-800",
  },
  en_mora: {
    label: "En Mora",
    icon: AlertTriangle,
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
  },
  completado: {
    label: "Completado",
    icon: CheckCircle2,
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
};

const frequencyLabels: Record<string, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

export default function FinancingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // State
  const [financing, setFinancing] = useState<FinancingCard | null>(null);
  const [payments, setPayments] = useState<BillingRecordCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialogs
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Simulación
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentWeek, setCurrentWeek] = useState(1); // Semana de simulación actual

  // Fetch billing records directamente (más confiable que populate)
  const fetchBillingRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/billing?financing=${id}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching billing records:", err);
    }
  }, [id]);

  // Fetch financing data
  const fetchFinancing = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/financing/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Financiamiento no encontrado");
        }
        throw new Error("Error al cargar el financiamiento");
      }

      const data = await response.json();
      setFinancing(data.data);
      
      // Fetch payments directamente para asegurar datos actualizados
      await fetchBillingRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchBillingRecords]);

  // Fetch test mode config
  const fetchTestModeConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/configuration");
      if (response.ok) {
        const data = await response.json();
        const configs = data.data || [];
        const testModeConfig = configs.find((c: { key?: string; value?: string }) => c.key === "billing-test-mode-enabled");
        setIsTestModeEnabled(testModeConfig?.value === "true");
      }
    } catch (err) {
      console.error("Error loading test mode config:", err);
    }
  }, []);
  
  // Fetch current user role
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/user-profile/me");
      if (response.ok) {
        const data = await response.json();
        setCurrentUserRole(data.data?.role || "");
      }
    } catch (err) {
      console.error("Error loading current user:", err);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchFinancing();
      fetchTestModeConfig();
      fetchCurrentUser();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fetchFinancing]);

  // Delete financing
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/financing/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar");
      }
      toast.success("Financiamiento eliminado");
      router.push("/billing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Format helpers
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    try {
      return format(new Date(`${dateString}T00:00:00`), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout title="Cargando...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error || !financing) {
    return (
      <AdminLayout title="Error">
        <Card className={components.card}>
          <CardContent className={cn(spacing.card.padding, "text-center")}>
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive mb-4">{error || "Financiamiento no encontrado"}</p>
            <Button variant="outline" onClick={() => router.push("/billing")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Financiamientos
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const status = (financing.status as FinancingStatus) || "activo";
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const progressPercentage = financing.totalQuotas > 0 
    ? (financing.paidQuotas / financing.totalQuotas) * 100 
    : 0;

  // Preselected financing for payment dialog
  const preselectedFinancing = {
    documentId: financing.documentId,
    financingNumber: financing.financingNumber,
    vehicleName: financing.vehicleName || "Sin vehículo",
    vehiclePlate: financing.vehiclePlate,
    clientName: financing.clientName || "Sin cliente",
    quotaAmount: financing.quotaAmount,
    paidQuotas: financing.paidQuotas,
    totalQuotas: financing.totalQuotas,
    currentBalance: financing.currentBalance,
    nextDueDate: financing.nextDueDate,
    partialPaymentCredit: financing.partialPaymentCredit || 0,
    lateFeePercentage: financing.lateFeePercentage || 10,
    status: financing.status,
  };

  return (
    <AdminLayout title="">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => router.push("/billing")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              config.bgColor,
              "border-2",
              config.borderColor
            )}>
              <StatusIcon className={cn("h-6 w-6", config.textColor)} />
            </div>
            <div>
              <h1 className={typography.h2}>{financing.financingNumber}</h1>
              <Badge
                variant="outline"
                className={cn("text-sm", config.bgColor, config.textColor, config.borderColor)}
              >
                {config.label}
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Vehicle & Client Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className={components.card}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vehículo</p>
                <p className={typography.body.large}>{financing.vehicleName || "Sin vehículo"}</p>
                {financing.vehiclePlate && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {financing.vehiclePlate}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={components.card}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className={typography.body.large}>{financing.clientName || "Sin cliente"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className={cn(components.card, "mb-6")}>
        <CardHeader className={spacing.card.header}>
          <CardTitle className={cn(typography.h4, "flex items-center gap-2")}>
            <DollarSign className="h-5 w-5" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>
        <CardContent className={spacing.card.content}>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progreso</span>
              <span className={typography.body.large}>
                {financing.paidQuotas} de {financing.totalQuotas} cuotas ({progressPercentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Monto Total</p>
              <p className={cn(typography.metric.base, "text-primary")}>
                {formatCurrency(financing.totalAmount)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Cuota</p>
              <p className={cn(typography.metric.base, "text-primary")}>
                {formatCurrency(financing.quotaAmount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {frequencyLabels[financing.paymentFrequency] || financing.paymentFrequency}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Pagado</p>
              <p className={cn(typography.metric.base, "text-green-600")}>
                {formatCurrency(financing.totalPaid)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
              <p className={cn(typography.metric.base, "text-primary")}>
                {formatCurrency(financing.currentBalance)}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Inicio</p>
                <p className="text-sm">{formatDate(financing.startDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Próximo Vencimiento</p>
                <p className="text-sm">{formatDate(financing.nextDueDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duración</p>
                <p className="text-sm">{financing.financingMonths} meses</p>
              </div>
            </div>
          </div>

          {/* Late fees if any */}
          {financing.totalLateFees > 0 && (
            <div className={cn(
              "mt-4 p-3 rounded-lg flex items-center justify-between",
              "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
            )}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-400">
                  Multas Acumuladas
                </span>
              </div>
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                {formatCurrency(financing.totalLateFees)}
              </span>
            </div>
          )}

          {/* Credit if any */}
          {financing.partialPaymentCredit > 0 && (
            <div className={cn(
              "mt-4 p-3 rounded-lg flex items-center justify-between",
              "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            )}>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  Crédito a Favor
                </span>
              </div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                {formatCurrency(financing.partialPaymentCredit)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <CreatePaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        preselectedFinancing={preselectedFinancing}
        onSuccess={() => {
          fetchFinancing();
          toast.success("Pago registrado exitosamente");
        }}
      />

      {/* Calculator (readonly) */}
      <div className="mb-6">
        <FinancingCalculator
          totalAmount={financing.totalAmount}
          financingMonths={financing.financingMonths}
          paymentFrequency={financing.paymentFrequency}
          startDate={financing.startDate}
          totalQuotas={financing.totalQuotas}
          showInputs={false}
          readOnly={true}
        />
      </div>

      {/* Payments Timeline */}
      <PaymentTimeline
        payments={(payments || []).map((p): PaymentRecord => {
          // Calcular faltante por pagar para adelantos
          const remainingAmount = p.status === "adelanto" && p.quotaAmountCovered && p.amount
            ? p.amount - p.quotaAmountCovered
            : 0;
          
          // Calcular a qué cuota se está adelantando
          const advanceForQuota = p.status === "adelanto" && p.quotaNumber && p.quotasCovered
            ? p.quotaNumber + p.quotasCovered
            : undefined;
          
          return {
            // Mostrar datos directamente del backend sin recalcular
            // Solo los botones Martes/Viernes actualizan el backend
            id: p.id,
            invoiceNumber: p.receiptNumber || "",
            amount: p.amount,
            status: p.status as "pagado" | "pendiente" | "adelanto" | "retrasado",
            dueDate: p.dueDate || new Date().toISOString(),
            paymentDate: p.paymentDate,
            quotaNumber: p.quotaNumber,
            lateFeeAmount: p.lateFeeAmount,
            daysLate: p.daysLate,
            currency: p.currency,
            clientName: p.clientName,
            // Datos de adelanto
            quotasCovered: p.quotasCovered,
            quotaAmountCovered: p.quotaAmountCovered,
            advanceCredit: p.advanceCredit,
            advanceForQuota,
            remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
          };
        })}
        title="Historial de Pagos"
        isTestModeEnabled={isTestModeEnabled}
        userRole={currentUserRole}
        financingId={id}
        currentWeek={currentWeek}
        onWeekChange={(week) => setCurrentWeek(week)}
        onSimulateTuesday={async () => {
          // Calcular fecha de simulación: martes de la semana actual
          // Encontrar el martes de la primera semana basado en startDate
          const startDate = financing?.startDate ? new Date(financing.startDate) : new Date();
          const startDay = startDate.getDay(); // 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
          // Días hasta el próximo martes (si startDate es martes, daysToTuesday = 0)
          const daysToTuesday = (2 - startDay + 7) % 7;
          const firstTuesday = new Date(startDate);
          firstTuesday.setDate(startDate.getDate() + daysToTuesday);
          
          // Martes de la semana simulada
          const baseDate = new Date(firstTuesday);
          baseDate.setDate(firstTuesday.getDate() + (currentWeek - 1) * 7);
          const simulationDate = baseDate.toISOString().split("T")[0];
          
          const res = await fetch("/api/invoices/simulate-generation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ simulationDate }),
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`Semana ${currentWeek}: Se generaron ${data.generatedCount} cuotas pendientes`);
            
            // Después de generar, actualizar días de atraso de cuotas retrasadas anteriores
            // usando el martes de esta semana como fecha de referencia
            const startDate = financing?.startDate ? new Date(financing.startDate) : new Date();
            const startDay = startDate.getDay();
            const daysToTuesday = (2 - startDay + 7) % 7;
            const firstTuesday = new Date(startDate);
            firstTuesday.setDate(startDate.getDate() + daysToTuesday);
            
            const tuesdayDate = new Date(firstTuesday);
            tuesdayDate.setDate(firstTuesday.getDate() + (currentWeek - 1) * 7);
            const updateDate = tuesdayDate.toISOString().split("T")[0];
            
            // Llamar a simulate-overdue para recalcular días de cuotas ya retrasadas
            await fetch("/api/invoices/simulate-overdue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ simulationDate: updateDate, mode: "update-existing" }),
            });
            
            fetchFinancing();
          } else {
            toast.error(data.error || "Error al generar cuotas");
          }
        }}
        onSimulateFriday={async () => {
          // Calcular fecha de simulación: viernes de la semana actual
          // Encontrar el martes de la primera semana basado en startDate
          const startDate = financing?.startDate ? new Date(financing.startDate) : new Date();
          const startDay = startDate.getDay();
          const daysToTuesday = (2 - startDay + 7) % 7;
          const firstTuesday = new Date(startDate);
          firstTuesday.setDate(startDate.getDate() + daysToTuesday);
          
          // Viernes de la semana simulada (martes + 3 días)
          const baseDate = new Date(firstTuesday);
          baseDate.setDate(firstTuesday.getDate() + (currentWeek - 1) * 7 + 3);
          const simulationDate = baseDate.toISOString().split("T")[0];
          
          const res = await fetch("/api/invoices/simulate-overdue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ simulationDate }),
          });
          const data = await res.json();
          if (data.success) {
            if (data.overdueCount === 0) {
              toast("No hay cuotas pendientes por vencer");
            } else {
              toast.warning(`Semana ${currentWeek}: ${data.overdueCount} cuotas marcadas como retrasadas. Penalidad total: $${data.totalPenaltyAmount?.toFixed(2) || 0}`);
            }
            // Quedarse en la misma semana para ver el resultado del viernes
            fetchFinancing();
          } else {
            toast.error(data.error || "Error al actualizar cuotas");
          }
        }}
        maxHeight="400px"
        showSummary={true}
        showFilters={true}
        onPaymentClick={(payment) => {
          const record = payments.find(p => p.id === payment.id);
          if (record) {
            router.push(`/billing/details/${record.documentId}`);
          }
        }}
        onDeletePayment={async (payment) => {
          if (!confirm(`¿Eliminar la cuota ${payment.invoiceNumber}?`)) return;
          
          try {
            const response = await fetch(`/api/billing/${payment.id}`, {
              method: "DELETE",
            });
            
            if (!response.ok) {
              throw new Error("Error al eliminar la cuota");
            }
            
            toast.success("Cuota eliminada correctamente");
            fetchFinancing(); // Refrescar datos
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al eliminar");
          }
        }}
      />

      {/* Register Payment Button */}
      <Button
        className="w-full mt-6 mb-6 h-12 text-base font-bold"
        onClick={() => setIsPaymentDialogOpen(true)}
      >
        <Plus className="mr-2 h-5 w-5" />
        Registrar Pago
      </Button>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este financiamiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>{financing.financingNumber}</strong>.
              Esto también eliminará todos los pagos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
