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
import { Calendar, Plus, Loader2 } from "lucide-react";
import { spacing, typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";
import type { AppointmentType, AppointmentStatus } from "@/validations/types";

export interface CreateAppointmentFormData {
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: string;
  description: string;
  price: string;
  location: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
}

interface CreateAppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateAppointmentFormData;
  setFormData: Dispatch<SetStateAction<CreateAppointmentFormData>>;
  isCreating: boolean;
  isFormValid: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const appointmentTypes: { value: AppointmentType; label: string }[] = [
  { value: "prueba", label: "Prueba de Conducción" },
  { value: "venta", label: "Venta" },
  { value: "mantenimiento", label: "Mantenimiento" },
];

const appointmentStatuses: { value: AppointmentStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "cancelada", label: "Cancelada" },
];

export function AddAppointmentButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 z-50"
      size="icon"
      onClick={onClick}
      aria-label="Agregar nueva cita"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}

export function CreateAppointmentDialog({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  isCreating,
  isFormValid,
  onConfirm,
  onCancel,
}: CreateAppointmentDialogProps) {
  const resolveMeridiemValue = () => {
    if (!formData.scheduledTime) return "AM";
    const [hours] = formData.scheduledTime.split(":");
    const hour24 = parseInt(hours, 10);
    return hour24 >= 12 ? "PM" : "AM";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] p-0 !flex !flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className={typography.h2}>Agregar Nueva Cita</DialogTitle>
          <DialogDescription>
            Completa los campos requeridos para programar una nueva cita.
          </DialogDescription>
        </DialogHeader>

        <ScrollAreaPrimitive.Root className="relative flex-1 min-h-0 overflow-hidden">
          <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
            <div className="px-6">
              <div className={`flex flex-col ${spacing.gap.medium} py-6`}>
                {/* Información Básica */}
                <div className={`flex flex-col ${spacing.gap.base}`}>
                  <h3 className={typography.h4}>Información de la Cita</h3>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="type" className={typography.label}>
                      Tipo de Cita <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as AppointmentType }))}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="title" className={typography.label}>
                      Título (opcional)
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej: Prueba de conducción SUV"
                      className="rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="status" className={typography.label}>
                        Estado
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as AppointmentStatus }))}
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {appointmentStatuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="durationMinutes" className={typography.label}>
                        Duración (minutos)
                      </Label>
                      <Input
                        id="durationMinutes"
                        type="number"
                        value={formData.durationMinutes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                        placeholder="Ej: 60"
                        className="rounded-lg"
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Fecha y Hora */}
                <div className={`flex flex-col ${spacing.gap.base}`}>
                  <h3 className={typography.h4}>Fecha y Hora</h3>
                  
                  <div className={`flex flex-col ${spacing.gap.small}`}>
                    <Label>Fecha y Hora Programada <span className="text-destructive">*</span></Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col lg:flex-row gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full lg:flex-1 justify-start text-left font-normal h-10 pl-3 rounded-lg",
                                !formData.scheduledDate && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {formData.scheduledDate ? (
                                format(
                                  new Date(`${formData.scheduledDate}T00:00:00`),
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
                                formData.scheduledDate
                                  ? new Date(`${formData.scheduledDate}T00:00:00`)
                                  : undefined
                              }
                              onSelect={(date) => {
                                if (date) {
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, "0");
                                  const day = String(date.getDate()).padStart(2, "0");
                                  setFormData((prev) => ({ ...prev, scheduledDate: `${year}-${month}-${day}` }));
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
                        
                        <div className="flex flex-col sm:flex-row gap-2 lg:flex-1 items-center">
                          <Input
                            type="number"
                            min="1"
                            max="12"
                            value={
                              formData.scheduledTime
                                ? String(
                                    (() => {
                                      const [hours] = formData.scheduledTime.split(":");
                                      const hour24 = parseInt(hours, 10);
                                      return hour24 === 0
                                        ? 12
                                        : hour24 > 12
                                        ? hour24 - 12
                                        : hour24;
                                    })()
                                  )
                                : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 12)) {
                                const currentMinutes = formData.scheduledTime
                                  ? formData.scheduledTime.split(":")[1] || "00"
                                  : "00";
                                const currentHour24 = formData.scheduledTime
                                  ? parseInt(formData.scheduledTime.split(":")[0], 10)
                                  : 0;
                                const isPM = currentHour24 >= 12;

                                if (value === "") {
                                  setFormData((prev) => ({ ...prev, scheduledTime: `00:${currentMinutes}` }));
                                } else {
                                  const hour12 = parseInt(value, 10);
                                  const hour24 =
                                    hour12 === 12 ? (isPM ? 12 : 0) : isPM ? hour12 + 12 : hour12;
                                  setFormData((prev) => ({ ...prev, scheduledTime: `${String(hour24).padStart(2, "0")}:${currentMinutes}` }));
                                }
                              }
                            }}
                            className="w-full sm:w-20 h-10 rounded-lg"
                            placeholder="12"
                          />
                          <span className="text-muted-foreground hidden sm:inline">:</span>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={formData.scheduledTime ? formData.scheduledTime.split(":")[1] || "00" : ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 59)) {
                                const currentHours = formData.scheduledTime
                                  ? formData.scheduledTime.split(":")[0] || "00"
                                  : "00";
                                const minutes = value === "" ? "00" : String(parseInt(value, 10)).padStart(2, "0");
                                setFormData((prev) => ({ ...prev, scheduledTime: `${currentHours}:${minutes}` }));
                              }
                            }}
                            className="w-full sm:w-20 h-10 rounded-lg"
                            placeholder="00"
                          />
                          <Select
                            value={resolveMeridiemValue()}
                            onValueChange={(value) => {
                              const [hours, minutes] = (formData.scheduledTime || "09:00").split(":");
                              const hour24 = parseInt(hours, 10);
                              let newHour24 = hour24;

                              if (value === "PM" && hour24 < 12) {
                                newHour24 = hour24 + 12;
                              } else if (value === "AM" && hour24 >= 12) {
                                newHour24 = hour24 - 12;
                              }

                              setFormData((prev) => ({ ...prev, scheduledTime: `${String(newHour24).padStart(2, "0")}:${minutes}` }));
                            }}
                          >
                            <SelectTrigger className="w-full sm:w-24 h-10 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Descripción y Precio */}
                <div className={`flex flex-col ${spacing.gap.base}`}>
                  <h3 className={typography.h4}>Detalles</h3>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="description" className={typography.label}>
                      Descripción
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe los detalles de la cita..."
                      className="rounded-lg min-h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="price" className={typography.label}>
                        Precio / Costo
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                        placeholder="Ej: 350"
                        className="rounded-lg"
                        min={0}
                        step="0.01"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="location" className={typography.label}>
                        Ubicación
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                        placeholder="Ej: Concesionario Central"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Información de Contacto */}
                <div className={`flex flex-col ${spacing.gap.base}`}>
                  <h3 className={typography.h4}>Contacto</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contactPhone" className={typography.label}>
                        Teléfono
                      </Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="Ej: +34 612 345 678"
                        className="rounded-lg"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contactEmail" className={typography.label}>
                        Email
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="Ej: cliente@email.com"
                        className="rounded-lg"
                      />
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
                      placeholder="Notas internas sobre la cita..."
                      className="rounded-lg min-h-20"
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
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creando...
              </>
            ) : (
              "Crear Cita"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const initialFormData: CreateAppointmentFormData = {
  title: "",
  type: "prueba",
  status: "pendiente",
  scheduledDate: "",
  scheduledTime: "09:00",
  durationMinutes: "60",
  description: "",
  price: "",
  location: "",
  contactPhone: "",
  contactEmail: "",
  notes: "",
};
