"use client";

import { Button } from "@/components_shadcn/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components_shadcn/ui/dialog";
import { Calendar as CalendarComponent } from "@/components_shadcn/ui/calendar";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Separator } from "@/components_shadcn/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components_shadcn/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components_shadcn/ui/popover";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { es as dayPickerEs } from "react-day-picker/locale";
import { Calendar } from "lucide-react";
import { spacing, typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";
import type { BillingStatus } from "@/validations/types";

export interface CreateBillingFormData {
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: BillingStatus;
  dueDate: string;
  paymentDate: string;
  notes: string;
}

interface CreateBillingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateBillingFormData;
  setFormData: Dispatch<SetStateAction<CreateBillingFormData>>;
  isCreating: boolean;
  isFormValid: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const currencies = [
  { value: "USD", label: "USD - Dólar estadounidense" },
  { value: "PAB", label: "PAB - Balboa panameño" },
  { value: "EUR", label: "EUR - Euro" },
];

const statusOptions: { value: BillingStatus; label: string; color: string }[] = [
  { value: "pendiente", label: "Pendiente", color: "text-yellow-600" },
  { value: "pagado", label: "Pagado", color: "text-green-600" },
  { value: "retrasado", label: "Retrasado", color: "text-red-600" },
];

export function CreateBillingDialog({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  isCreating,
  isFormValid,
  onConfirm,
  onCancel,
}: CreateBillingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] p-0 !flex !flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className={typography.h2}>Registrar Pago Manual</DialogTitle>
          <DialogDescription>
            Completa los campos requeridos para registrar un nuevo pago en el sistema.
          </DialogDescription>
        </DialogHeader>

        <ScrollAreaPrimitive.Root className="relative flex-1 min-h-0 overflow-hidden">
          <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
            <div className="px-6">
              <div className={`flex flex-col ${spacing.gap.medium} py-6`}>
                {/* Información de la Factura */}
                <div className={`flex flex-col ${spacing.gap.base}`}>
                  <h3 className={typography.h4}>Información de la Factura</h3>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="invoiceNumber" className={typography.label}>
                      Número de Factura <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                      placeholder="Ej: 2024-001"
                      className="rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="amount" className={typography.label}>
                        Monto <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Ej: 350.00"
                        className="rounded-lg"
                        min={0}
                        step="0.01"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="currency" className={typography.label}>
                        Moneda
                      </Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {currencies.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="status" className={typography.label}>
                      Estado <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as BillingStatus }))}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <span className={status.color}>{status.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Fechas */}
                <div className={`flex flex-col ${spacing.gap.base}`}>
                  <h3 className={typography.h4}>Fechas</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className={typography.label}>
                        Fecha de Vencimiento
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 pl-3 rounded-lg",
                              !formData.dueDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.dueDate ? (
                              format(
                                new Date(`${formData.dueDate}T00:00:00`),
                                "d 'de' MMMM, yyyy",
                                { locale: es }
                              )
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={
                              formData.dueDate
                                ? new Date(`${formData.dueDate}T00:00:00`)
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, "0");
                                const day = String(date.getDate()).padStart(2, "0");
                                setFormData((prev) => ({ ...prev, dueDate: `${year}-${month}-${day}` }));
                              }
                            }}
                            initialFocus
                            locale={dayPickerEs}
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2030}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className={typography.label}>
                        Fecha de Pago
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 pl-3 rounded-lg",
                              !formData.paymentDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.paymentDate ? (
                              format(
                                new Date(`${formData.paymentDate}T00:00:00`),
                                "d 'de' MMMM, yyyy",
                                { locale: es }
                              )
                            ) : (
                              <span>Sin fecha de pago</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={
                              formData.paymentDate
                                ? new Date(`${formData.paymentDate}T00:00:00`)
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, "0");
                                const day = String(date.getDate()).padStart(2, "0");
                                setFormData((prev) => ({ ...prev, paymentDate: `${year}-${month}-${day}` }));
                              } else {
                                setFormData((prev) => ({ ...prev, paymentDate: "" }));
                              }
                            }}
                            initialFocus
                            locale={dayPickerEs}
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2030}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Notas */}
                <div className={`flex flex-col ${spacing.gap.base}`}>
                  <h3 className={typography.h4}>Notas Adicionales</h3>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes" className={typography.label}>
                      Notas
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Añade cualquier nota o comentario adicional sobre este pago..."
                      rows={4}
                      className="rounded-lg resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollAreaPrimitive.Viewport>
          <ScrollAreaPrimitive.ScrollAreaScrollbar
            orientation="vertical"
            className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
          >
            <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
          </ScrollAreaPrimitive.ScrollAreaScrollbar>
          <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={isCreating}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCreating || !isFormValid}
            className={cn(
              "font-semibold shadow-md hover:shadow-lg transition-all duration-200",
              !isCreating && isFormValid && "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 !opacity-100",
              (isCreating || !isFormValid) && "!opacity-50 cursor-not-allowed"
            )}
          >
            {isCreating ? "Registrando..." : "Registrar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const initialBillingFormData: CreateBillingFormData = {
  invoiceNumber: "",
  amount: "",
  currency: "USD",
  status: "pendiente",
  dueDate: "",
  paymentDate: "",
  notes: "",
};

export function validateBillingForm(formData: CreateBillingFormData): boolean {
  return (
    formData.invoiceNumber.trim() !== "" &&
    formData.amount.trim() !== "" &&
    parseFloat(formData.amount) >= 0
  );
}
