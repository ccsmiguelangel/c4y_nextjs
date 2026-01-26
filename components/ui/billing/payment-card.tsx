"use client";

import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  FileText,
  Calendar,
  BadgeCheck,
  Link as LinkIcon
} from "lucide-react";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Badge } from "@/components_shadcn/ui/badge";
import { typography, components } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { BillingRecordCard } from "@/lib/billing";

interface PaymentCardProps {
  payment: BillingRecordCard;
  onClick?: () => void;
  onFinancingClick?: (financingId: string) => void;
  className?: string;
  compact?: boolean;
  showFinancingLink?: boolean;
}

type PaymentStatus = "pagado" | "pendiente" | "adelanto" | "retrasado";

const statusConfig: Record<PaymentStatus, {
  label: string;
  icon: typeof CheckCircle2;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  pagado: {
    label: "Pagado",
    icon: CheckCircle2,
    bgColor: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  adelanto: {
    label: "Adelanto",
    icon: DollarSign,
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  retrasado: {
    label: "Retrasado",
    icon: AlertTriangle,
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

export function PaymentCard({
  payment,
  onClick,
  onFinancingClick,
  className,
  compact = false,
  showFinancingLink = true,
}: PaymentCardProps) {
  const status = (payment.status as PaymentStatus) || "pendiente";
  const config = statusConfig[status] || statusConfig.pendiente;
  const StatusIcon = config.icon;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: payment.currency || "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("es-PA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleFinancingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (payment.financingId && onFinancingClick) {
      onFinancingClick(payment.financingId);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
          config.bgColor,
          config.borderColor,
          className
        )}
        onClick={onClick}
      >
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center",
          config.bgColor,
          "border",
          config.borderColor
        )}>
          <StatusIcon className={cn("h-4 w-4", config.textColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(typography.body.large, "truncate")}>
              {payment.receiptNumber}
            </p>
            {payment.quotaNumber && (
              <Badge variant="outline" className="text-xs">
                Cuota #{payment.quotaNumber}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(payment.paymentDate || payment.dueDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className={cn(typography.body.large)}>{formatCurrency(payment.amount)}</p>
          {payment.verifiedInBank && (
            <BadgeCheck className="h-4 w-4 text-green-600" />
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        components.card,
        "cursor-pointer transition-all hover:shadow-md",
        onClick && "hover:border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              config.bgColor,
              "border",
              config.borderColor
            )}>
              <StatusIcon className={cn("h-5 w-5", config.textColor)} />
            </div>
            <div>
              <p className={cn(typography.body.large, "font-semibold")}>
                {payment.receiptNumber}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    config.bgColor,
                    config.textColor,
                    config.borderColor
                  )}
                >
                  {config.label}
                </Badge>
                {payment.quotaNumber && (
                  <Badge variant="secondary" className="text-xs">
                    Cuota #{payment.quotaNumber}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Verificación */}
          {payment.verifiedInBank ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <BadgeCheck className="h-5 w-5" />
              <span className="text-xs">Verificado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pendiente</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Fecha de pago: {formatDate(payment.paymentDate)}</span>
          </div>
          {payment.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Fecha de vencimiento: {formatDate(payment.dueDate)}</span>
            </div>
          )}
          {payment.confirmationNumber && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Confirmación: {payment.confirmationNumber}</span>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Monto</p>
            <p className={cn(typography.body.large, "font-semibold")}>
              {formatCurrency(payment.amount)}
            </p>
          </div>
          {payment.quotasCovered && payment.quotasCovered > 1 && (
            <div>
              <p className="text-xs text-muted-foreground">Cuotas cubiertas</p>
              <p className={cn(typography.body.large, "font-semibold")}>
                {payment.quotasCovered}
              </p>
            </div>
          )}
        </div>

        {/* Late fee indicator */}
        {payment.lateFeeAmount && payment.lateFeeAmount > 0 && (
          <div className={cn(
            "mt-3 p-2 rounded-lg flex items-center justify-between",
            "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          )}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-red-700 dark:text-red-400">
                {payment.daysLate} día{payment.daysLate !== 1 ? "s" : ""} de atraso
              </span>
            </div>
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">
              +{formatCurrency(payment.lateFeeAmount)}
            </span>
          </div>
        )}

        {/* Advance credit indicator */}
        {payment.advanceCredit && payment.advanceCredit > 0 && (
          <div className={cn(
            "mt-3 p-2 rounded-lg flex items-center justify-between",
            "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
          )}>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-400">
                Crédito a favor
              </span>
            </div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              {formatCurrency(payment.advanceCredit)}
            </span>
          </div>
        )}

        {/* Financing Link */}
        {showFinancingLink && payment.financingNumber && (
          <button
            className={cn(
              "mt-3 w-full p-2 rounded-lg flex items-center justify-between",
              "bg-muted/50 hover:bg-muted transition-colors text-left"
            )}
            onClick={handleFinancingClick}
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Financiamiento:</span>
              <span className="text-xs font-medium">{payment.financingNumber}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Ver
            </Badge>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentCard;
