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
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { commonClasses, spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface Payment {
  id: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  status: "pagado" | "pendiente" | "retrasado";
  dateLabel: string;
  date: string;
}

const payments: Payment[] = [
  {
    id: "1",
    clientName: "Ana López",
    invoiceNumber: "Factura #2024-015",
    amount: 350.0,
    status: "retrasado",
    dateLabel: "Vence:",
    date: "01/06/2024",
  },
  {
    id: "2",
    clientName: "Jorge Martinez",
    invoiceNumber: "Factura #2024-014",
    amount: 500.0,
    status: "pagado",
    dateLabel: "Pagado:",
    date: "02/06/2024",
  },
  {
    id: "3",
    clientName: "Laura Gómez",
    invoiceNumber: "Factura #2024-012",
    amount: 275.5,
    status: "pendiente",
    dateLabel: "Vence:",
    date: "15/06/2024",
  },
  {
    id: "4",
    clientName: "Ricardo Pérez",
    invoiceNumber: "Factura #2024-011",
    amount: 420.0,
    status: "retrasado",
    dateLabel: "Vence:",
    date: "28/05/2024",
  },
];

const getStatusBadge = (status: Payment["status"]) => {
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

const getAmountColor = (status: Payment["status"]) => {
  switch (status) {
    case "pagado":
      return "text-green-600";
    case "pendiente":
      return "text-yellow-600";
    case "retrasado":
      return "text-red-600";
  }
};

const getActionButton = (status: Payment["status"], onClick: (e: React.MouseEvent) => void) => {
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

export default function BillingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    
    // Filtro por fecha
    let matchesDate = true;
    if (dateFilter) {
      // Convertir la fecha del pago (dd/mm/yyyy) a formato yyyy-mm-dd para comparar
      const [day, month, year] = payment.date.split("/");
      const paymentDateFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      matchesDate = paymentDateFormatted === dateFilter;
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
        <Button className="w-full rounded-lg bg-primary h-12 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2">
          <CreditCard className="h-5 w-5" />
          Registrar Pago Manual
        </Button>
      </div>

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

      {/* Lista de Pagos */}
      <div className={`flex flex-col ${spacing.gap.medium} px-0`}>
        {filteredPayments.map((payment) => (
          <Card
            key={payment.id}
            className={`${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
            onClick={() => router.push(`/billing/details/${payment.id}`)}
          >
            <CardContent className={spacing.card.padding}>
              <div className={`flex items-start justify-between ${spacing.gap.base}`}>
                <div className="flex flex-col">
                  <p className={`${typography.body.large} font-bold`}>
                    {payment.clientName}
                  </p>
                  <p className={typography.body.base}>
                    {payment.invoiceNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`${typography.metric.base} font-bold ${getAmountColor(payment.status)}`}
                  >
                    $ {payment.amount.toFixed(2)}
                  </p>
                  <div className="mt-1">{getStatusBadge(payment.status)}</div>
                </div>
              </div>
              <div
                className={`mt-4 flex items-center justify-between ${typography.body.base}`}
              >
                <p className={typography.body.small}>
                  {payment.dateLabel} {payment.date}
                </p>
                {getActionButton(payment.status, (e) => {
                  e.stopPropagation();
                  router.push(`/billing/details/${payment.id}`);
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
