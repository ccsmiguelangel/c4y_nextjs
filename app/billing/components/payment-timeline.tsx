"use client";

import { useMemo, useState } from "react";
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
import { typography, spacing, components } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type PeriodFilter = "all" | "week" | "biweekly" | "month" | "semester" | "year" | "custom";

export type PaymentStatus = "pagado" | "pendiente" | "adelanto" | "retrasado";

export interface PaymentRecord {
  id: string | number;
  invoiceNumber: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paymentDate?: string;
  quotaNumber?: number;
  lateFeeAmount?: number;
  daysLate?: number;
  currency?: string;
  // Info de adelanto
  quotasCovered?: number;
  quotaAmountCovered?: number;
  advanceCredit?: number;
  advanceForQuota?: number; // Cuota a la que se aplica el adelanto
  remainingAmount?: number; // Faltante por pagar
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
  // Props para simulación
  isTestModeEnabled?: boolean;
  userRole?: string;
  onSimulateTuesday?: () => Promise<void>;
  onSimulateFriday?: () => Promise<void>;
  financingId?: string;
  currentWeek?: number; // Semana de simulación actual
  onWeekChange?: (week: number) => void; // Callback para cambiar de semana
  onDeletePayment?: (payment: PaymentRecord) => void; // Callback para eliminar pago
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
};

export function PaymentTimeline({
  payments,
  maxHeight = "400px",
  showSummary = true,
  showFilters = true,
  title = "Timeline de Pagos",
  onPaymentClick,
  className,
  isTestModeEnabled = false,
  userRole = "",
  onSimulateTuesday,
  onSimulateFriday,
  financingId,
  currentWeek = 1,
  onWeekChange,
  onDeletePayment,
}: PaymentTimelineProps) {
  // Estado de filtros
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  
  // Estado de simulación
  const [isSimulatingTuesday, setIsSimulatingTuesday] = useState(false);
  const [isSimulatingFriday, setIsSimulatingFriday] = useState(false);
  
  // Verificar si debe mostrar controles de simulación
  const showSimulationControls = isTestModeEnabled && userRole === "admin" && financingId;

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
      result = result.filter((payment) => payment.status === statusFilter);
    }
    
    return result;
  }, [payments, periodFilter, startDate, endDate, statusFilter]);

  // Calcular totales SIEMPRE de todos los pagos (no de la lista filtrada)
  const summary = useMemo(() => {
    const paid = payments.filter((p) => p.status === "pagado");
    const pending = payments.filter((p) => p.status === "pendiente");
    const advance = payments.filter((p) => p.status === "adelanto");
    const overdue = payments.filter((p) => p.status === "retrasado");

    return {
      total: payments.length,
      paid: paid.length,
      pending: pending.length,
      advance: advance.length,
      overdue: overdue.length,
      paidAmount: paid.reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
      advanceAmount: advance.reduce((sum, p) => sum + p.amount, 0),
      overdueAmount: overdue.reduce((sum, p) => sum + p.amount + (p.lateFeeAmount || 0), 0),
      totalCollected: paid.reduce((sum, p) => sum + p.amount, 0) + advance.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [filteredPayments]);

  // Ordenar pagos por fecha de vencimiento (más reciente primero)
  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort((a, b) => 
      new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
  }, [filteredPayments]);

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
            {/* Filtro activo */}
            {statusFilter !== "all" && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mb-3">
                <span className="text-xs text-muted-foreground">
                  Filtrando: <strong className="text-foreground">{statusConfig[statusFilter].label}</strong>
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setStatusFilter("all")}
                >
                  Ver todos
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => setStatusFilter("pagado")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.pagado.bgColor,
                  "border-2",
                  statusFilter === "pagado" ? "border-gray-800" : statusConfig.pagado.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.pagado.textColor)}>
                  {summary.paid}
                </p>
                <p className={cn("text-xs", statusConfig.pagado.textColor)}>Pagados</p>
              </button>
              <button
                onClick={() => setStatusFilter("pendiente")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.pendiente.bgColor,
                  "border-2",
                  statusFilter === "pendiente" ? "border-gray-800" : statusConfig.pendiente.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.pendiente.textColor)}>
                  {summary.pending}
                </p>
                <p className={cn("text-xs", statusConfig.pendiente.textColor)}>Pendientes</p>
              </button>
              <button
                onClick={() => setStatusFilter("adelanto")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.adelanto.bgColor,
                  "border-2",
                  statusFilter === "adelanto" ? "border-gray-800" : statusConfig.adelanto.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.adelanto.textColor)}>
                  {summary.advance}
                </p>
                <p className={cn("text-xs", statusConfig.adelanto.textColor)}>Adelantos</p>
              </button>
              <button
                onClick={() => setStatusFilter("retrasado")}
                className={cn(
                  "rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity",
                  statusConfig.retrasado.bgColor,
                  "border-2",
                  statusFilter === "retrasado" ? "border-gray-800" : statusConfig.retrasado.borderColor
                )}
              >
                <p className={cn("text-2xl font-bold", statusConfig.retrasado.textColor)}>
                  {summary.overdue}
                </p>
                <p className={cn("text-xs", statusConfig.retrasado.textColor)}>Retrasados</p>
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
            {sortedPayments.length === 0 ? (
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
                    const config = statusConfig[payment.status];
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
                        <div className={cn(
                          "rounded-lg p-3 border transition-all",
                          config.bgColor,
                          config.borderColor,
                          "group-hover:shadow-sm"
                        )}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={typography.body.large}>
                                  {payment.invoiceNumber}
                                </span>
                                {payment.quotaNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    Cuota #{payment.quotaNumber}
                                  </Badge>
                                )}
                                <Badge className={cn(
                                  "text-xs",
                                  config.bgColor,
                                  config.textColor,
                                  "border",
                                  config.borderColor
                                )}>
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Vence: {formatDate(payment.dueDate)}
                                </span>
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
                                </p>
                                {payment.lateFeeAmount && payment.lateFeeAmount > 0 && (
                                  <div className="text-xs text-destructive">
                                    <p>+ {formatCurrency(payment.lateFeeAmount, payment.currency)} multa</p>
                                    {payment.daysLate && payment.daysLate > 0 && (
                                      <p className="text-red-600 dark:text-red-400">
                                        {payment.daysLate} día{payment.daysLate > 1 ? 's' : ''} de atraso
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Info de adelanto */}
                                {payment.status === "adelanto" && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400">
                                    {payment.advanceForQuota && (
                                      <p>Adelanto para Cuota #{payment.advanceForQuota}</p>
                                    )}
                                    {payment.remainingAmount && payment.remainingAmount > 0 && (
                                      <p>Falta por pagar: {formatCurrency(payment.remainingAmount, payment.currency)}</p>
                                    )}
                                    {payment.advanceCredit && payment.advanceCredit > 0 && (
                                      <p>Crédito disponible: {formatCurrency(payment.advanceCredit, payment.currency)}</p>
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
            <div className="flex justify-between items-center text-sm">
              <span className={typography.label}>Total de {summary.total} pagos:</span>
              <div className="flex gap-4">
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(summary.paidAmount)} pagados
                </span>
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
    </Card>
  );
}
