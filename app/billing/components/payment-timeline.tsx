"use client";

import { useMemo, useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, subWeeks, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  DollarSign,
  FileText,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Play,
  Loader2,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Badge } from "@/components_shadcn/ui/badge";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { Separator } from "@/components_shadcn/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components_shadcn/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components_shadcn/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components_shadcn/ui/dialog";
import { typography, spacing, components } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type PeriodFilter = "all" | "week" | "biweekly" | "month" | "semester" | "year" | "custom";

export type PaymentStatus = "pagado" | "pendiente" | "adelanto" | "retrasado" | "abonado";

// Tipo extendido para filtros que incluye "multa" (pagos con amount < 0)
export type PaymentStatusFilter = PaymentStatus | "multa" | "all";

export interface PaymentRecord {
  id: string | number;
  documentId?: string; // documentId de Strapi (para operaciones CRUD)
  invoiceNumber: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paymentDate?: string;
  quotaNumber?: number;
  lateFeeAmount?: number;
  daysLate?: number;
  currency?: string;
  createdAt?: string; // Fecha de creación para ordenamiento
  // Info de adelanto/abonado
  quotasCovered?: number;
  quotaAmountCovered?: number;
  advanceCredit?: number; // Crédito disponible para cuotas futuras
  remainingQuotaBalance?: number; // Saldo pendiente de la cuota actual (falta por pagar)
  advanceForQuota?: number; // Cuota a la que se aplica el adelanto
  // Info de abonado
  partialQuotaStart?: number; // Primera cuota abonada
  partialQuotaEnd?: number; // Última cuota abonada
  // Info de saldo para cuotas pendientes (calculado)
  quotaTotalAmount?: number; // Monto total de la cuota
  paidAmount?: number; // Monto ya pagado/abonado a esta cuota
  balanceDue?: number; // Saldo pendiente = quotaTotalAmount - paidAmount
  // Info de cliente para filtrado
  clientId?: string;
  clientDocumentId?: string;
  clientName?: string;
}

interface PaymentTimelineProps {
  payments: PaymentRecord[];
  maxHeight?: string;
  showSummary?: boolean;
  showFilters?: boolean;
  title?: string;
  onPaymentClick?: (payment: PaymentRecord) => void;
  className?: string;
  isLoading?: boolean; // Estado de carga
  // Props para simulación
  isTestModeEnabled?: boolean;
  userRole?: string;
  onSimulateTuesday?: () => Promise<void>;
  onSimulateFriday?: () => Promise<void>;
  financingId?: string;
  currentWeek?: number; // Semana de simulación actual
  onWeekChange?: (week: number) => void; // Callback para cambiar de semana
  onDeletePayment?: (payment: PaymentRecord) => void; // Callback para eliminar pago
  // Props para cálculo de saldos
  partialPaymentCredit?: number; // Crédito acumulado del financiamiento
  quotaAmount?: number; // Monto de cada cuota
  paymentFrequency?: "semanal" | "quincenal" | "mensual"; // Frecuencia de pago
  // Props para cálculo de cuota actual
  paidQuotas?: number; // Cuotas pagadas/cubiertas del financiamiento
  totalQuotas?: number; // Total de cuotas del financiamiento
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "week", label: "Esta semana" },
  { value: "biweekly", label: "Últimos 15 días" },
  { value: "month", label: "Este mes" },
  { value: "semester", label: "Últimos 6 meses" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Personalizado" },
];

const statusConfig: Record<PaymentStatus, {
  label: string;
  icon: typeof CheckCircle2;
  bgColor: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  pagado: {
    label: "Pagado",
    icon: CheckCircle2,
    bgColor: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
    dotColor: "bg-green-500",
  },
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    dotColor: "bg-yellow-500",
  },
  adelanto: {
    label: "Adelanto",
    icon: DollarSign,
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
    dotColor: "bg-blue-500",
  },
  retrasado: {
    label: "Retrasado",
    icon: AlertCircle,
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
    dotColor: "bg-red-500",
  },
  abonado: {
    label: "Abonado",
    icon: DollarSign,
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-200 dark:border-purple-800",
    dotColor: "bg-purple-500",
  },
};

// Config para multas (pagos con amount < 0)
const multaConfig = {
  label: "Multa",
  icon: AlertCircle,
  bgColor: "bg-orange-50 dark:bg-orange-950/30",
  textColor: "text-orange-700 dark:text-orange-400",
  borderColor: "border-orange-200 dark:border-orange-800",
  dotColor: "bg-orange-500",
};

export function PaymentTimeline({
  payments,
  maxHeight = "400px",
  showSummary = true,
  showFilters = true,
  title = "Timeline de Pagos",
  onPaymentClick,
  className,
  isLoading = false,
  isTestModeEnabled = false,
  userRole = "",
  onSimulateTuesday,
  onSimulateFriday,
  financingId,
  currentWeek = 1,
  onWeekChange,
  onDeletePayment,
  partialPaymentCredit = 0,
  quotaAmount,
  paymentFrequency = "semanal",
  paidQuotas = 0,
  totalQuotas = 0,
}: PaymentTimelineProps) {
  // Estado de filtros
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  
  // Estado para expandir/colapsar detalle de abonos
  const [expandedAbonos, setExpandedAbonos] = useState<Set<string | number>>(new Set());
  
  // Estado para modal de detalle de abono
  const [selectedAbono, setSelectedAbono] = useState<PaymentRecord | null>(null);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  
  // DEBUG: Log de pagos recibidos
  useEffect(() => {
    console.log(`[PaymentTimeline] Pagos recibidos: ${payments.length}`, {
      total: payments.length,
      pagados: payments.filter(p => p.status === "pagado").length,
      pendientes: payments.filter(p => p.status === "pendiente").length,
      abonados: payments.filter(p => p.status === "abonado").length,
      adelantos: payments.filter(p => p.status === "adelanto").length,
      retrasados: payments.filter(p => p.status === "retrasado").length,
    });
  }, [payments]);
  
  // Estado de simulación
  const [isSimulatingTuesday, setIsSimulatingTuesday] = useState(false);
  const [isSimulatingFriday, setIsSimulatingFriday] = useState(false);
  
  // Verificar si debe mostrar controles de simulación
  const showSimulationControls = isTestModeEnabled && userRole === "admin" && financingId;
  
  // Función para toggle expandir/colapsar detalle de abono
  const toggleAbonoDetail = (paymentId: string | number) => {
    setExpandedAbonos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };
  
  // Función para abrir modal de detalle de abono
  const openAbonoDetail = (payment: PaymentRecord, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedAbono(payment);
    setIsAbonoModalOpen(true);
  };
  
  // Función para cerrar modal de detalle de abono
  const closeAbonoDetail = () => {
    setIsAbonoModalOpen(false);
    setSelectedAbono(null);
  };

  const formatCurrency = (value: number, currency = "USD"): string => {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Generar identificador corto para mostrar en la UI (sin documentId largo)
  const getShortIdentifier = (payment: PaymentRecord): string => {
    // Si es una cuota SIM, mostrar formato corto: SIM-YYYYMMDD-#N
    if (payment.invoiceNumber?.startsWith("SIM-")) {
      const parts = payment.invoiceNumber.split("-");
      if (parts.length >= 4) {
        // parts[0] = SIM, parts[1] = fecha, parts[2] = documentId (omitir), parts[3] = cuota
        const date = parts[1];
        const quota = parts[parts.length - 1];
        return `SIM-${date}-#${quota}`;
      }
    }
    // Para otros formatos, truncar si es muy largo
    if (payment.invoiceNumber && payment.invoiceNumber.length > 25) {
      return payment.invoiceNumber.substring(0, 22) + "...";
    }
    // Default: devolver el invoiceNumber completo o un identificador basado en cuota
    return payment.invoiceNumber || `Cuota #${payment.quotaNumber || "?"}`;
  };

  // Calcular fecha hasta la que cubre el abono (próximo vencimiento)
  const calculateNextDueDate = (
    startDate: string,
    quotasCovered: number,
    frequency: "semanal" | "quincenal" | "mensual"
  ): string => {
    try {
      const baseDate = new Date(startDate);
      const nextQuota = quotasCovered + 1; // La siguiente cuota no cubierta
      
      let daysToAdd = 0;
      switch (frequency) {
        case "semanal":
          daysToAdd = (nextQuota - 1) * 7; // Cada cuota = 7 días
          break;
        case "quincenal":
          daysToAdd = (nextQuota - 1) * 15; // Cada cuota = 15 días
          break;
        case "mensual":
          // Para mensual, usamos addMonths
          const result = new Date(baseDate);
          result.setMonth(result.getMonth() + (nextQuota - 1));
          return format(result, "d MMM yyyy", { locale: es });
        default:
          daysToAdd = (nextQuota - 1) * 7;
      }
      
      const resultDate = new Date(baseDate);
      resultDate.setDate(resultDate.getDate() + daysToAdd);
      return format(resultDate, "d MMM yyyy", { locale: es });
    } catch {
      return "-";
    }
  };

  // Calcular rango de fechas según el período seleccionado
  const getDateRange = (period: PeriodFilter): { start: Date; end: Date } | null => {
    const today = new Date();
    
    switch (period) {
      case "week":
        return { start: startOfWeek(today, { locale: es }), end: endOfWeek(today, { locale: es }) };
      case "biweekly":
        return { start: subDays(today, 15), end: today };
      case "month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "semester":
        return { start: subMonths(today, 6), end: today };
      case "year":
        return { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) };
      case "custom":
        if (startDate && endDate) {
          return { start: new Date(startDate), end: new Date(endDate) };
        }
        return null;
      default:
        return null;
    }
  };

  // Filtrar pagos según período y status seleccionados
  const filteredPayments = useMemo(() => {
    let result = payments;
    
    // Filtrar por período
    const dateRange = getDateRange(periodFilter);
    if (dateRange) {
      result = result.filter((payment) => {
        const paymentDate = new Date(payment.paymentDate || payment.dueDate);
        return isWithinInterval(paymentDate, { start: dateRange.start, end: dateRange.end });
      });
    }
    
    // Filtrar por status
    if (statusFilter !== "all") {
      if (statusFilter === "multa") {
        // Filtrar pagos con monto negativo (multas/ajustes)
        result = result.filter((payment) => payment.amount < 0);
      } else {
        result = result.filter((payment) => payment.status === statusFilter);
      }
    }
    
    return result;
  }, [payments, periodFilter, startDate, endDate, statusFilter]);

  // Calcular totales SIEMPRE de todos los pagos (no de la lista filtrada)
  const summary = useMemo(() => {
    const paid = payments.filter((p) => p.status === "pagado");
    const pending = payments.filter((p) => p.status === "pendiente");
    const advance = payments.filter((p) => p.status === "adelanto");
    const overdue = payments.filter((p) => p.status === "retrasado");
    const partial = payments.filter((p) => p.status === "abonado");
    // Multas: pagos con monto negativo (independientemente del status)
    const multas = payments.filter((p) => p.amount < 0);

    return {
      total: payments.length,
      paid: paid.length,
      pending: pending.length,
      advance: advance.length,
      overdue: overdue.length,
      partial: partial.length,
      multas: multas.length,
      paidAmount: paid.reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
      advanceAmount: advance.reduce((sum, p) => sum + p.amount, 0),
      overdueAmount: overdue.reduce((sum, p) => sum + p.amount + (p.lateFeeAmount || 0), 0),
      partialAmount: partial.reduce((sum, p) => sum + p.amount, 0),
      multasAmount: multas.reduce((sum, p) => sum + p.amount, 0), // Será negativo
      totalCollected: paid.reduce((sum, p) => sum + p.amount, 0) + advance.reduce((sum, p) => sum + p.amount, 0) + partial.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  // DEBUG: Log de props recibidos
  useEffect(() => {
    console.log("[PaymentTimeline] Props recibidos:", {
      partialPaymentCredit,
      quotaAmount,
      totalPayments: payments.length,
      allPayments: payments.map(p => ({ 
        id: p.id,
        status: p.status, 
        quotaNumber: p.quotaNumber, 
        amount: p.amount,
        quotaAmountCovered: p.quotaAmountCovered,
        advanceCredit: p.advanceCredit,
        remainingQuotaBalance: p.remainingQuotaBalance,
      })),
    });
  }, [partialPaymentCredit, quotaAmount, payments]);

  // Calcular saldos pendientes para cuotas (considerando abonos aplicados y crédito acumulado)
  const paymentsWithBalance = useMemo(() => {
    console.log("[paymentsWithBalance] Iniciando cálculo con:", { partialPaymentCredit, quotaAmount });
    
    // DEBUG: Mostrar todos los pagos para diagnóstico
    console.log("[paymentsWithBalance] Todos los pagos:", payments.map(p => ({
      id: p.id,
      status: p.status,
      quotaNumber: p.quotaNumber,
      amount: p.amount,
      quotaAmountCovered: p.quotaAmountCovered,
      advanceCredit: p.advanceCredit,
      remainingQuotaBalance: p.remainingQuotaBalance,
    })));
    
    // El monto base de cada cuota
    const baseQuotaAmount = quotaAmount || 0;
    
    // Mapa para trackear cuánto se ha pagado de cada cuota
    const quotaPayments: Record<number, { totalPaid: number; creditApplied: number }> = {};
    
    // RECALCULAR crédito desde los pagos (ignorar partialPaymentCredit del backend si es inconsistente)
    let availableCredit = 0;
    
    // PRIMERO: Calcular crédito disponible desde abonos/adelantos
    // El crédito es: monto total del abono - (número de cuotas cubiertas × monto por cuota)
    payments.forEach((payment) => {
      if (payment.status === "abonado" && payment.quotaNumber && baseQuotaAmount > 0) {
        // CORRECCIÓN: Crédito = abono - (n cuotas × monto cuota)
        const totalAbono = payment.amount;
        const quotasCoveredCount = payment.quotasCovered || 1;
        const totalQuotasAmount = quotasCoveredCount * baseQuotaAmount;
        const excess = totalAbono - totalQuotasAmount;
        console.log(`[paymentsWithBalance] Analizando abono: cuota ${payment.quotaNumber}, totalAbono=${totalAbono}, cuotas=${quotasCoveredCount}, totalCuotas=${totalQuotasAmount}, exceso=${excess}`);
        if (excess > 0) {
          console.log(`[paymentsWithBalance] Abono genera crédito: ${excess}`);
          availableCredit += excess;
        } else {
          console.log(`[paymentsWithBalance] Abono NO genera crédito: exceso=${excess}`);
        }
      }
    });
    
    // Si el cálculo da 0 pero hay partialPaymentCredit del backend, usar el del backend como fallback
    if (availableCredit === 0 && partialPaymentCredit > 0) {
      console.log(`[paymentsWithBalance] Usando partialPaymentCredit del backend: ${partialPaymentCredit}`);
      availableCredit = partialPaymentCredit;
    }
    
    console.log(`[paymentsWithBalance] Crédito recalculado desde pagos: ${availableCredit}`);
    
    // SEGUNDO: Procesar todos los pagos para calcular cuánto se pagó de cada cuota
    payments.forEach((payment) => {
      if (!payment.quotaNumber) return;
      
      const qNum = payment.quotaNumber;
      
      if (!quotaPayments[qNum]) {
        quotaPayments[qNum] = { totalPaid: 0, creditApplied: 0 };
      }
      
      if (payment.status === "pagado") {
        // Cuota pagada completamente
        quotaPayments[qNum].totalPaid = baseQuotaAmount;
      } else if (payment.status === "abonado") {
        // Abono parcial
        const amountApplied = payment.quotaAmountCovered || payment.amount;
        quotaPayments[qNum].totalPaid += Math.min(amountApplied, baseQuotaAmount);
      } else if (payment.status === "adelanto") {
        // Adelanto - puede cubrir múltiples cuotas
        const quotasCovered = payment.quotasCovered || 1;
        const amountPerQuota = quotasCovered > 1 
          ? (payment.quotaAmountCovered || payment.amount) / quotasCovered
          : (payment.quotaAmountCovered || payment.amount);
        
        for (let i = 0; i < quotasCovered; i++) {
          const targetQuota = qNum + i;
          if (!quotaPayments[targetQuota]) {
            quotaPayments[targetQuota] = { totalPaid: 0, creditApplied: 0 };
          }
          quotaPayments[targetQuota].totalPaid += Math.min(amountPerQuota, baseQuotaAmount);
        }
      }
    });
    
    console.log("[paymentsWithBalance] Pagos por cuota:", quotaPayments);
    
    // TERCERO: Aplicar crédito disponible a cuotas pendientes en orden
    const pendingQuotas = [...filteredPayments]
      .filter(p => p.status === "pendiente" && p.quotaNumber)
      .sort((a, b) => (a.quotaNumber || 0) - (b.quotaNumber || 0))
      .map(p => p.quotaNumber!);
    
    console.log("[paymentsWithBalance] Cuotas pendientes ordenadas:", pendingQuotas);
    
    const creditAppliedToQuota: Record<number, number> = {};
    let remainingCredit = availableCredit;
    
    pendingQuotas.forEach((qNum) => {
      const alreadyPaid = quotaPayments[qNum]?.totalPaid || 0;
      const remaining = Math.max(0, baseQuotaAmount - alreadyPaid);
      
      // Aplicar crédito disponible a esta cuota
      const creditToApply = Math.min(remainingCredit, remaining);
      creditAppliedToQuota[qNum] = creditToApply;
      remainingCredit -= creditToApply;
      
      console.log(`[paymentsWithBalance] Cuota ${qNum}: total=${baseQuotaAmount}, pagado=${alreadyPaid}, crédito aplicado=${creditToApply}, falta=${remaining - creditToApply}`);
    });
    
    // CUARTO: Mapear cada pago con su información de saldo
    const result = filteredPayments.map((payment) => {
      const qNum = payment.quotaNumber;
      const qTotal = baseQuotaAmount || payment.quotaTotalAmount || payment.amount;
      
      // Para cuotas pendientes: calcular saldo faltante considerando crédito
      if (payment.status === "pendiente" && qNum) {
        const totalPaid = quotaPayments[qNum]?.totalPaid || 0;
        const creditApplied = creditAppliedToQuota[qNum] || 0;
        const effectivePaid = totalPaid + creditApplied;
        const balanceDue = Math.max(0, qTotal - effectivePaid);
        
        console.log(`[paymentsWithBalance] Pendiente cuota ${qNum}: total=${qTotal}, pagado=${totalPaid}, crédito=${creditApplied}, falta=${balanceDue}`);
        
        return {
          ...payment,
          quotaTotalAmount: qTotal,
          paidAmount: effectivePaid,
          balanceDue: balanceDue,
        };
      }
      
      // Para abonos: mostrar información del saldo restante para la siguiente cuota
      if (payment.status === "abonado" && qNum) {
        // El abono genera crédito para la siguiente cuota
        const amountApplied = payment.quotaAmountCovered || payment.amount;
        const excessCredit = Math.max(0, amountApplied - baseQuotaAmount);
        
        // Buscar la siguiente cuota pendiente para mostrar cuánto falta de ella
        const nextPendingQuota = pendingQuotas.find(q => q > qNum);
        let nextQuotaBalance = 0;
        
        if (nextPendingQuota && excessCredit > 0) {
          const nextQuotaTotal = baseQuotaAmount;
          nextQuotaBalance = Math.max(0, nextQuotaTotal - excessCredit);
          console.log(`[paymentsWithBalance] Abono cuota ${qNum}: monto=${amountApplied}, excedente=${excessCredit}, siguiente cuota ${nextPendingQuota} falta=${nextQuotaBalance}`);
        } else if (nextPendingQuota) {
          // Si hay siguiente cuota pero el abono no generó excedente, usar el crédito disponible general
          const creditForNext = creditAppliedToQuota[nextPendingQuota] || 0;
          nextQuotaBalance = Math.max(0, baseQuotaAmount - creditForNext);
          console.log(`[paymentsWithBalance] Abono cuota ${qNum}: sin excedente, siguiente cuota ${nextPendingQuota} falta=${nextQuotaBalance} (crédito aplicado=${creditForNext})`);
        } else {
          // Si no hay siguiente cuota pendiente, mostrar saldo de la cuota actual
          nextQuotaBalance = Math.max(0, baseQuotaAmount - amountApplied);
        }
        
        return {
          ...payment,
          quotaTotalAmount: qTotal,
          paidAmount: amountApplied,
          balanceDue: nextQuotaBalance,
        };
      }
      
      return payment;
    });
    
    console.log("[paymentsWithBalance] Resultado final:", result.map(r => ({ 
      id: r.id, 
      status: r.status, 
      quotaNumber: r.quotaNumber, 
      balanceDue: r.balanceDue 
    })));
    
    return result;
  }, [payments, filteredPayments, partialPaymentCredit, quotaAmount]);

  // Calcular la próxima cuota por pagar basada en pagos y abonos
  const nextQuotaToPay = useMemo(() => {
    // Encontrar la última cuota cubierta entre todos los pagos
    let maxCoveredQuota = 0;
    
    payments.forEach((payment) => {
      if (payment.status === "pagado" && payment.quotaNumber) {
        maxCoveredQuota = Math.max(maxCoveredQuota, payment.quotaNumber);
      } else if ((payment.status === "abonado" || payment.status === "adelanto") && payment.quotaNumber) {
        // Para abonos y adelantos, calcular el rango cubierto
        const quotasCovered = payment.quotasCovered || 1;
        const endQuota = payment.quotaNumber + quotasCovered - 1;
        maxCoveredQuota = Math.max(maxCoveredQuota, endQuota);
      }
    });
    
    // La próxima cuota es la última cubierta + 1, o paidQuotas + 1 si no hay cubiertas
    const baseNextQuota = maxCoveredQuota > 0 ? maxCoveredQuota + 1 : (paidQuotas || 0) + 1;
    
    // No exceder el total de cuotas
    return totalQuotas > 0 ? Math.min(baseNextQuota, totalQuotas) : baseNextQuota;
  }, [payments, paidQuotas, totalQuotas]);

  // Verificar si la próxima cuota por pagar ya tiene un billing-record generado
  const isNextQuotaGenerated = useMemo(() => {
    if (nextQuotaToPay <= 0) return false;
    // Buscar si existe un billing-record con quotaNumber = nextQuotaToPay y status pendiente/retrasado
    return payments.some(p => 
      p.quotaNumber === nextQuotaToPay && 
      (p.status === "pendiente" || p.status === "retrasado")
    );
  }, [payments, nextQuotaToPay]);

  // Ordenar pagos por fecha de creación (descendente - más reciente primero)
  const sortedPayments = useMemo(() => {
    return [...paymentsWithBalance].sort((a, b) => {
      // Usar createdAt si está disponible, de lo contrario usar dueDate como fallback
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : new Date(a.dueDate).getTime();
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : new Date(b.dueDate).getTime();
      return dateB - dateA; // Orden descendente (más reciente primero)
    });
  }, [paymentsWithBalance]);

  const clearFilters = () => {
    setPeriodFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = periodFilter !== "all";
  
  // Handlers para simulación
  const handleSimulateTuesday = async () => {
    if (!onSimulateTuesday) return;
    setIsSimulatingTuesday(true);
    try {
      await onSimulateTuesday();
    } finally {
      setIsSimulatingTuesday(false);
    }
  };
  
  const handleSimulateFriday = async () => {
    if (!onSimulateFriday) return;
    setIsSimulatingFriday(true);
    try {
      await onSimulateFriday();
    } finally {
      setIsSimulatingFriday(false);
    }
  };

  return (
    <Card className={cn(components.card, className)}>
      <CardHeader className={cn(spacing.card.header, "flex flex-row items-center justify-between flex-wrap gap-2")}>
        <CardTitle className={cn(typography.h4, "flex items-center gap-2")}>
          <Calendar className="h-5 w-5" />
          {title}
        </CardTitle>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botones de Simulación (solo en modo pruebas) */}
          {showSimulationControls && (
            <div className="flex items-center gap-2 mr-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex flex-col items-center px-2 border-r border-purple-200 dark:border-purple-700">
                <span className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold">Semana</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                    onClick={() => onWeekChange?.(Math.max(1, currentWeek - 1))}
                    disabled={currentWeek <= 1}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300 min-w-[1.5rem] text-center">{currentWeek}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                    onClick={() => onWeekChange?.(currentWeek + 1)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">Simular:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 text-xs"
                onClick={handleSimulateTuesday}
                disabled={isSimulatingTuesday}
                title="Genera nuevas cuotas pendientes como si fuera martes"
              >
                {isSimulatingTuesday ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Martes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 text-xs"
                onClick={handleSimulateFriday}
                disabled={isSimulatingFriday}
                title="Pasa las cuotas pendientes vencidas a estado retrasado con penalidad"
              >
                {isSimulatingFriday ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                Viernes
              </Button>
            </div>
          )}
        
        {showFilters && (
          <div className="flex items-center gap-2">
            {/* Selector de período */}
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de fechas personalizadas */}
            {periodFilter === "custom" && (
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Filter className="h-3 w-3" />
                    Fechas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <h4 className={typography.body.large}>Rango de fechas</h4>
                      <p className="text-xs text-muted-foreground">
                        Selecciona el período que deseas visualizar
                      </p>
                    </div>
                    <div className="grid gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="startDate" className="text-xs">Desde</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="endDate" className="text-xs">Hasta</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        </div>
      </CardHeader>
      <CardContent className={cn("flex flex-col", spacing.gap.medium, spacing.card.content)}>
        {/* Período activo */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Mostrando: <strong className="text-foreground">{periodOptions.find(p => p.value === periodFilter)?.label}</strong>
              {periodFilter === "custom" && startDate && endDate && (
                <span className="ml-1">({formatDate(startDate)} - {formatDate(endDate)})</span>
              )}
            </span>
            <span className={cn(typography.body.large, "text-primary font-bold")}>
              Total recaudado: {formatCurrency(summary.totalCollected)}
            </span>
          </div>
        )}

        {/* Summary con filtros */}
        {showSummary && (
          <>
            {/* Filtros activos */}
            {(statusFilter !== "all" || periodFilter !== "all") && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center gap-2">
                  {statusFilter !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      Estado: {statusFilter === "multa" ? "Multa" : statusConfig[statusFilter].label}
                    </Badge>
                  )}
                  {periodFilter !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      Período: {periodOptions.find(p => p.value === periodFilter)?.label}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-2">
                    Mostrando {filteredPayments.length} de {payments.length} pagos
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => {
                    setStatusFilter("all");
                    setPeriodFilter("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <button
                onClick={() => setStatusFilter(statusFilter === "pagado" ? "all" : "pagado")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.pagado.bgColor,
                  "border-2",
                  statusFilter === "pagado" ? "border-gray-800 ring-2 ring-offset-1 ring-gray-800" : statusConfig.pagado.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.pagado.textColor)}>
                  {summary.paid}
                </p>
                <p className={cn("text-xs", statusConfig.pagado.textColor)}>Pagados</p>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "pendiente" ? "all" : "pendiente")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.pendiente.bgColor,
                  "border-2",
                  statusFilter === "pendiente" ? "border-gray-800 ring-2 ring-offset-1 ring-gray-800" : statusConfig.pendiente.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.pendiente.textColor)}>
                  {summary.pending}
                </p>
                <p className={cn("text-xs", statusConfig.pendiente.textColor)}>Pendientes</p>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "abonado" ? "all" : "abonado")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.abonado.bgColor,
                  "border-2",
                  statusFilter === "abonado" ? "border-gray-800 ring-2 ring-offset-1 ring-gray-800" : statusConfig.abonado.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.abonado.textColor)}>
                  {summary.partial}
                </p>
                <p className={cn("text-xs", statusConfig.abonado.textColor)}>Abonados</p>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "adelanto" ? "all" : "adelanto")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.adelanto.bgColor,
                  "border-2",
                  statusFilter === "adelanto" ? "border-gray-800 ring-2 ring-offset-1 ring-gray-800" : statusConfig.adelanto.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.adelanto.textColor)}>
                  {summary.advance}
                </p>
                <p className={cn("text-xs", statusConfig.adelanto.textColor)}>Adelantos</p>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "retrasado" ? "all" : "retrasado")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.retrasado.bgColor,
                  "border-2",
                  statusFilter === "retrasado" ? "border-gray-800 ring-2 ring-offset-1 ring-gray-800" : statusConfig.retrasado.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.retrasado.textColor)}>
                  {summary.overdue}
                </p>
                <p className={cn("text-xs", statusConfig.retrasado.textColor)}>Retrasados</p>
              </button>
              {/* Botón de Multas (pagos con amount < 0) */}
              <button
                onClick={() => setStatusFilter(statusFilter === "multa" ? "all" : "multa")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  multaConfig.bgColor,
                  "border-2",
                  statusFilter === "multa" ? "border-gray-800 ring-2 ring-offset-1 ring-gray-800" : multaConfig.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", multaConfig.textColor)}>
                  {summary.multas}
                </p>
                <p className={cn("text-xs", multaConfig.textColor)}>Multas</p>
              </button>
            </div>
            <Separator />
          </>
        )}

        {/* Timeline con scroll */}
        <ScrollAreaPrimitive.Root 
          className="relative overflow-hidden" 
          style={{ height: maxHeight }}
        >
          <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className={typography.body.base}>Cargando pagos...</p>
              </div>
            ) : sortedPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-50" />
                <p className={typography.body.base}>No hay pagos registrados</p>
              </div>
            ) : (
              <div className="relative pr-4">
                {/* Línea vertical del timeline - altura calculada dinámicamente */}
                <div 
                  className="absolute left-[11px] top-2 w-0.5 bg-border" 
                  style={{ height: `calc(100% - 16px)` }}
                />

                <div className="flex flex-col gap-4">
                  {sortedPayments.map((payment) => {
                    // Detectar si es una multa (monto negativo)
                    const isMulta = payment.amount < 0;
                    // Usar config de multa o el config normal según corresponda
                    const config = isMulta ? multaConfig : statusConfig[payment.status];
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={payment.id}
                        className={cn(
                          "relative pl-8 cursor-pointer group",
                          onPaymentClick && "hover:opacity-80 transition-opacity"
                        )}
                        onClick={() => onPaymentClick?.(payment)}
                      >
                        {/* Dot */}
                        <div className={cn(
                          "absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center z-10",
                          config.bgColor,
                          "border-2",
                          config.borderColor
                        )}>
                          <StatusIcon className={cn("h-3 w-3", config.textColor)} />
                        </div>

                        {/* Content Card */}
                        <div 
                          className={cn(
                            "rounded-lg p-3 border transition-all",
                            config.bgColor,
                            config.borderColor,
                            "group-hover:shadow-sm"
                          )}
                          data-payment-id={payment.id}
                          data-document-id={payment.documentId}
                          data-receipt-number={payment.invoiceNumber}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Identificador corto (sin documentId largo) */}
                                <span 
                                  className={typography.body.large}
                                  title={payment.invoiceNumber} // Tooltip con valor completo
                                >
                                  {getShortIdentifier(payment)}
                                </span>
                                {/* Mostrar rango de cuotas en un solo tag */}
                                {payment.quotasCovered !== undefined && payment.quotasCovered > 1 && payment.quotaNumber ? (
                                  <Badge variant="outline" className="text-xs">
                                    Cuotas #{payment.quotaNumber}–#{payment.quotaNumber + payment.quotasCovered - 1}
                                  </Badge>
                                ) : payment.quotaNumber ? (
                                  <Badge variant="outline" className="text-xs">
                                    Cuota #{payment.quotaNumber}
                                  </Badge>
                                ) : null}
                                <Badge className={cn(
                                  "text-xs",
                                  // Si es multa (amount < 0), usar estilo de multa
                                  isMulta
                                    ? multaConfig.bgColor
                                    : (payment.status === "abonado" && !isNextQuotaGenerated)
                                      ? statusConfig.adelanto.bgColor
                                      : config.bgColor,
                                  isMulta
                                    ? multaConfig.textColor
                                    : (payment.status === "abonado" && !isNextQuotaGenerated)
                                      ? statusConfig.adelanto.textColor
                                      : config.textColor,
                                  "border",
                                  isMulta
                                    ? multaConfig.borderColor
                                    : (payment.status === "abonado" && !isNextQuotaGenerated)
                                      ? statusConfig.adelanto.borderColor
                                      : config.borderColor
                                )}>
                                  {/* Mostrar "Multa" si amount < 0, "Adelanto" si es abonado pero cuota no generada, sino el label normal */}
                                  {isMulta
                                    ? "Multa"
                                    : (payment.status === "abonado" && !isNextQuotaGenerated)
                                      ? statusConfig.adelanto.label
                                      : config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {/* Ocultar fecha de vencimiento para abonos y adelantos */}
                                {payment.status !== "abonado" && payment.status !== "adelanto" && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Vence: {formatDate(payment.dueDate)}
                                  </span>
                                )}
                                {payment.paymentDate && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    Pagado: {formatDate(payment.paymentDate)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className={cn(typography.body.large, "flex items-center gap-1")}>
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(payment.amount, payment.currency)}
                                  {payment.status === "abonado" && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {isNextQuotaGenerated ? "(abono)" : "(adelanto)"}
                                    </span>
                                  )}
                                </p>
                                {payment.lateFeeAmount !== undefined && payment.lateFeeAmount > 0 && (
                                  <div className="text-xs text-destructive">
                                    <p>+ {formatCurrency(payment.lateFeeAmount, payment.currency)} multa</p>
                                    {payment.daysLate !== undefined && payment.daysLate > 0 && (
                                      <p className="text-red-600 dark:text-red-400">
                                        {payment.daysLate} día{payment.daysLate > 1 ? 's' : ''} de atraso
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Info de adelanto */}
                                {payment.status === "adelanto" && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400">
                                    {payment.quotasCovered !== undefined && payment.quotasCovered > 1 ? (
                                      <p>Adelanto para Cuotas #{payment.quotaNumber}–#{payment.quotaNumber! + payment.quotasCovered - 1}</p>
                                    ) : payment.quotaNumber ? (
                                      <p>Adelanto para Cuota #{payment.quotaNumber}</p>
                                    ) : null}
                                    {/* Falta por pagar: saldo de la cuota a la que se aplica el adelanto */}
                                    {payment.remainingQuotaBalance > 0 && (
                                      <p>Falta por pagar: {formatCurrency(payment.remainingQuotaBalance, payment.currency)}</p>
                                    )}
                                    {/* Crédito disponible: para cuotas futuras (no aplicado aún) */}
                                    {payment.advanceCredit > 0 && (
                                      <p>Crédito disponible: {formatCurrency(payment.advanceCredit, payment.currency)}</p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Info de abonado/adelanto - Compacto con botón a modal */}
                                {(payment.status === "abonado" || payment.status === "adelanto") && (
                                  <div className={cn(
                                    "text-xs",
                                    isNextQuotaGenerated 
                                      ? "text-purple-600 dark:text-purple-400"  // Abonado: cuota ya existe
                                      : "text-blue-600 dark:text-blue-400"       // Adelanto: cuota no existe aún
                                  )}>
                                    {(() => {
                                      // CORRECCIÓN: Crédito = abono - (número de cuotas × monto por cuota)
                                      const quotasCoveredCount = payment.quotasCovered || 1;
                                      const totalQuotasAmount = quotasCoveredCount * quotaAmount;
                                      const creditFromAbono = quotaAmount > 0 
                                        ? Math.max(0, payment.amount - totalQuotasAmount) 
                                        : 0;
                                      // Calcular fecha del próximo abono
                                      const nextDueDate = payment.dueDate 
                                        ? calculateNextDueDate(payment.dueDate, quotasCoveredCount, paymentFrequency)
                                        : null;
                                      
                                      // Determinar si es Adelanto (cuota no generada) o Abonado (cuota existe)
                                      const isAdelanto = !isNextQuotaGenerated;
                                      
                                      return (
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-medium">
                                                {payment.quotasCovered !== undefined && payment.quotasCovered > 1 
                                                  ? `${payment.quotasCovered} cuotas (#${payment.quotaNumber}–#${payment.quotaNumber! + payment.quotasCovered - 1})`
                                                  : `Cuota #${payment.quotaNumber}`
                                                }
                                              </span>
                                              {creditFromAbono > 0 && (
                                                <>
                                                  <span className="opacity-50">·</span>
                                                  <span className={isAdelanto ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400 font-semibold"}>
                                                    Crédito: {formatCurrency(creditFromAbono, payment.currency)}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                            <button
                                              onClick={(e) => openAbonoDetail(payment, e)}
                                              className="text-xs underline hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                                            >
                                              Ver detalle
                                            </button>
                                          </div>
                                          {/* Próxima cuota por pagar */}
                                          <p className={isAdelanto ? "text-blue-600 dark:text-blue-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                                            Próxima cuota por pagar: <span className="font-bold">#{nextQuotaToPay}</span>
                                            {totalQuotas > 0 && (
                                              <span className="text-muted-foreground font-normal"> de {totalQuotas}</span>
                                            )}
                                            {isAdelanto && (
                                              <span className="ml-1 text-blue-500">(no generada)</span>
                                            )}
                                          </p>
                                          {/* Fecha del próximo abono */}
                                          {nextDueDate && (
                                            <p className="text-green-600 dark:text-green-400 font-medium">
                                              Próximo abono antes de: {nextDueDate}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                                
                                {/* Info de cuota pendiente - mostrar saldo faltante */}
                                {payment.status === "pendiente" && (
                                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                    {payment.balanceDue !== undefined && (
                                      <>
                                        {payment.paidAmount !== undefined && payment.paidAmount > 0 ? (
                                          <p>
                                            <span className="line-through opacity-70">
                                              {formatCurrency(payment.quotaTotalAmount || payment.amount, payment.currency)}
                                            </span>
                                            {" → "}
                                            <span className="font-semibold">
                                              Falta: {formatCurrency(payment.balanceDue, payment.currency)}
                                            </span>
                                          </p>
                                        ) : (
                                          <p>Falta por pagar: {formatCurrency(payment.balanceDue, payment.currency)}</p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Botón eliminar */}
                              {onDeletePayment && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePayment(payment);
                                  }}
                                  className="p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                                  title="Eliminar cuota"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                              
                              {onPaymentClick && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollAreaPrimitive.Viewport>
          <ScrollAreaPrimitive.ScrollAreaScrollbar
            orientation="vertical"
            className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
          >
            <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
          </ScrollAreaPrimitive.ScrollAreaScrollbar>
          <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>

        {/* Total Summary */}
        {showSummary && payments.length > 0 && (
          <>
            <Separator />
            <div className="flex justify-between items-center text-sm flex-wrap gap-2">
              <span className={typography.label}>Total de {summary.total} pagos:</span>
              <div className="flex gap-4 flex-wrap">
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(summary.paidAmount)} pagados
                </span>
                {summary.partialAmount > 0 && (
                  <span className="text-purple-600 dark:text-purple-400">
                    {formatCurrency(summary.partialAmount)} abonados
                  </span>
                )}
                <span className="text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(summary.pendingAmount)} pendientes
                </span>
                {summary.overdueAmount > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {formatCurrency(summary.overdueAmount)} retrasados
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      {/* Modal de detalle de abono */}
      <Dialog open={isAbonoModalOpen} onOpenChange={setIsAbonoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Detalle del Abono
            </DialogTitle>
            <DialogDescription>
              {selectedAbono?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAbono && (
            <div className="space-y-4 py-4">
              {/* Resumen del abono */}
              <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Abono total:</span>
                  <span className="text-lg font-semibold">
                    {formatCurrency(selectedAbono.amount, selectedAbono.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fecha:</span>
                  <span className="text-sm">{formatDate(selectedAbono.paymentDate || selectedAbono.dueDate)}</span>
                </div>
              </div>
              
              {/* Desglose por cuotas */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Desglose por cuotas:</h4>
                
                {(() => {
                  const quotasCovered = selectedAbono.quotasCovered || 1;
                  const startQuota = selectedAbono.quotaNumber || 1;
                  // CORRECCIÓN: Crédito = abono - (número de cuotas × monto por cuota)
                  const totalQuotasAmount = quotaAmount * quotasCovered;
                  const creditFromAbono = quotaAmount > 0 
                    ? Math.max(0, selectedAbono.amount - totalQuotasAmount) 
                    : 0;
                  // Falta por pagar de la siguiente cuota
                  const nextQuotaBalance = quotaAmount > 0 
                    ? Math.max(0, quotaAmount - creditFromAbono) 
                    : 0;
                  
                  return (
                    <div className="space-y-2">
                      {/* Resumen de cuotas cubiertas */}
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm">
                          {quotasCovered} cuotas cubiertas 
                          <span className="text-muted-foreground">
                            (#{startQuota}–#{startQuota + quotasCovered - 1})
                          </span>
                        </span>
                        <span className="text-sm font-medium">
                          {formatCurrency(totalQuotasAmount, selectedAbono.currency)}
                        </span>
                      </div>
                      
                      {/* Crédito generado */}
                      {creditFromAbono > 0 && (
                        <div className="flex justify-between items-center py-2 bg-blue-50 dark:bg-blue-950/30 px-3 rounded">
                          <span className="text-sm text-blue-700 dark:text-blue-400">Crédito generado (sobrante):</span>
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {formatCurrency(creditFromAbono, selectedAbono.currency)}
                          </span>
                        </div>
                      )}
                      
                      {/* Falta por pagar siguiente cuota */}
                      {nextQuotaBalance > 0 && (
                        <div className="flex justify-between items-center py-2 bg-yellow-50 dark:bg-yellow-950/30 px-3 rounded mt-2">
                          <span className="text-sm text-yellow-700 dark:text-yellow-400">
                            Falta cuota #{startQuota + quotasCovered}:
                          </span>
                          <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                            {formatCurrency(nextQuotaBalance, selectedAbono.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={closeAbonoDetail} variant="outline">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
