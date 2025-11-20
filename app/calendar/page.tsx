"use client";

import { useState } from "react";
import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Input } from "@/components_shadcn/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components_shadcn/ui/toggle-group";
import { Separator } from "@/components_shadcn/ui/separator";
import { Badge } from "@/components_shadcn/ui/badge";
import { Search, ChevronLeft, ChevronRight, Plus, MoreVertical, Car, ShoppingCart, Wrench } from "lucide-react";
import { typography, spacing, commonClasses } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

type AppointmentType = "all" | "venta" | "prueba" | "mantenimiento";

interface Appointment {
  id: string;
  time: string;
  period: "AM" | "PM";
  client: string;
  type: "venta" | "prueba" | "mantenimiento";
  description: string;
  status: "confirmada" | "pendiente" | "cancelada";
  price?: string;
  icon: "car" | "sell" | "maintenance";
  iconColor: "green" | "orange" | "blue" | "red";
  opacity?: number;
}

export default function CalendarPage() {
  const [viewType, setViewType] = useState<"monthly" | "weekly">("monthly");
  const [selectedFilter, setSelectedFilter] = useState<AppointmentType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 9, 1)); // Octubre 2024

  const appointments: Appointment[] = [
    {
      id: "1",
      time: "09:00",
      period: "AM",
      client: "Carlos Rodriguez",
      type: "prueba",
      description: "Prueba de Conducción - SUV Eléctrico",
      status: "confirmada",
      icon: "car",
      iconColor: "green",
    },
    {
      id: "2",
      time: "11:30",
      period: "AM",
      client: "Laura Gómez",
      type: "venta",
      description: "Venta - Sedán Híbrido",
      status: "pendiente",
      price: "Cotización: $42,500",
      icon: "sell",
      iconColor: "orange",
    },
    {
      id: "3",
      time: "02:00",
      period: "PM",
      client: "Javier Fernández",
      type: "mantenimiento",
      description: "Mantenimiento - 50.000km",
      status: "confirmada",
      price: "Costo: $350",
      icon: "maintenance",
      iconColor: "blue",
    },
    {
      id: "4",
      time: "04:30",
      period: "PM",
      client: "Miguel Torres",
      type: "prueba",
      description: "Prueba de Conducción - Coupé Deportivo",
      status: "cancelada",
      icon: "car",
      iconColor: "red",
      opacity: 0.6,
    },
  ];

  const daysWithAppointments = [5, 11, 16, 24];
  const currentDay = 5;

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const monthName = monthNames[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  const getStatusBadgeClass = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmada":
        return "bg-green-100 text-green-700";
      case "pendiente":
        return "bg-orange-100 text-orange-700";
      case "cancelada":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getIconColorClass = (color: Appointment["iconColor"]) => {
    switch (color) {
      case "green":
        return "text-green-500";
      case "orange":
        return "text-orange-500";
      case "blue":
        return "text-blue-500";
      case "red":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Filtrar por tipo
    const matchesFilter = selectedFilter === "all" || apt.type === selectedFilter;
    
    // Filtrar por búsqueda (cliente, descripción, precio)
    const matchesSearch = searchQuery === "" || 
      apt.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.price && apt.price.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  return (
    <AdminLayout
      title="Agenda de Citas"
      rightActions={
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex items-center justify-center">
          <Search className="h-5 w-5" />
        </Button>
      }
    >
        <div className="flex justify-center" aria-label="Tipo de vista">
          <ToggleGroup
            type="single"
            value={viewType}
            onValueChange={(value) => {
              if (value) setViewType(value as "monthly" | "weekly");
            }}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-muted p-1"
          >
            <ToggleGroupItem
              value="monthly"
              aria-label="Vista Mensual"
              className="flex h-full grow items-center justify-center px-2"
            >
              <span className={`truncate ${typography.body.base}`}>Vista Mensual</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="weekly"
              aria-label="Vista Semanal"
              className="flex h-full grow items-center justify-center px-2"
            >
              <span className={`truncate ${typography.body.base}`}>Vista Semanal</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <section className="flex justify-center" aria-label="Calendario">
        <Card className={`w-full flex flex-col gap-0.5 ${commonClasses.card}`}>
          <CardContent className={`flex items-center justify-between p-3 ${spacing.gap.medium}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              className="size-10 shrink-0 rounded-full hover:bg-gray-100 flex-shrink-0"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4 text-gray-800" />
            </Button>
            <time className={`flex-1 text-center ${typography.h4} whitespace-nowrap px-2`} dateTime={`${year}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`}>
              {monthName} {year}
            </time>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="size-10 shrink-0 rounded-full hover:bg-gray-100 flex-shrink-0"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4 text-gray-800" />
            </Button>
          </CardContent>
          <CardContent className="p-3">
            <ol className={`grid grid-cols-7 ${spacing.gap.small}`} role="grid">
              {["D", "L", "M", "M", "J", "V", "S"].map((day, index) => (
                <li key={index} className={`flex h-14 w-full items-center justify-center pb-0.5 ${typography.body.base} font-bold tracking-[0.015em] text-muted-foreground`} role="columnheader">
                  {day}
                </li>
              ))}
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const hasAppointment = daysWithAppointments.includes(day);
                const isCurrentDay = day === currentDay;
                return (
                  <li key={day} className={day === 1 ? "col-start-3" : ""}>
                    <button
                      className={`relative flex h-14 w-full items-center justify-center rounded-full ${typography.body.large} ${
                        isCurrentDay ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}
                      aria-label={`Día ${day}${hasAppointment ? ", tiene citas" : ""}`}
                      aria-current={isCurrentDay ? "date" : undefined}
                    >
                      {day}
                      {hasAppointment && !isCurrentDay && (
                        <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      )}
                      {hasAppointment && isCurrentDay && (
                        <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
        </section>

        <div className="flex justify-center" aria-label="Filtros de citas">
          <ToggleGroup
            type="single"
            value={selectedFilter}
            onValueChange={(value) => {
              if (value) setSelectedFilter(value as AppointmentType);
            }}
            className={`flex ${spacing.gap.small} w-full justify-center overflow-x-auto`}
          >
            {[
              { id: "all", label: "Todos" },
              { id: "venta", label: "Venta" },
              { id: "prueba", label: "Prueba de Conducción" },
              { id: "mantenimiento", label: "Mantenimiento" },
            ].map((filter) => (
              <ToggleGroupItem
                key={filter.id}
                value={filter.id}
                aria-label={filter.label}
                className="h-8 shrink-0 px-3"
              >
                <span className={typography.body.base}>{filter.label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por cliente, descripción o precio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
            aria-label="Buscar citas"
          />
        </div>

        <section className={`flex flex-col items-center ${spacing.gap.base} pb-24`}>
          <div className={`w-full flex flex-col ${spacing.gap.base}`}>
            <h2 className={typography.h2}>
              Citas para Hoy, 5 de Octubre
            </h2>
            {filteredAppointments.length === 0 ? (
              <p className={typography.body.small}>No hay citas para mostrar</p>
            ) : (
              <ol className={`flex flex-col ${spacing.gap.base}`}>
                {filteredAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    className={`flex items-start ${spacing.gap.medium} rounded-xl bg-white ${spacing.card.padding} ${commonClasses.card} ${
                      appointment.opacity ? `opacity-${Math.round(appointment.opacity * 100)}` : ""
                    }`}
                    style={appointment.opacity ? { opacity: appointment.opacity } : undefined}
                  >
                    <time className="flex w-16 flex-col items-center" dateTime={`2024-10-05T${appointment.time}`}>
                      <span className={typography.body.base}>{appointment.time}</span>
                      <span className={typography.body.small}>{appointment.period}</span>
                    </time>
                    <Separator orientation="vertical" className="h-auto" />
                    <div className="flex-1">
                      <h3 className={`${typography.h4} ${appointment.status === "cancelada" ? "line-through" : ""}`}>
                        {appointment.client}
                      </h3>
                      <p className={`flex items-center ${spacing.gap.small} ${typography.body.base} text-muted-foreground`}>
                        {appointment.icon === "car" && <Car className={`text-base ${getIconColorClass(appointment.iconColor)}`} />}
                        {appointment.icon === "sell" && <ShoppingCart className={`text-base ${getIconColorClass(appointment.iconColor)}`} />}
                        {appointment.icon === "maintenance" && <Wrench className={`text-base ${getIconColorClass(appointment.iconColor)}`} />}
                        {appointment.description}
                      </p>
                      <div className={`mt-2 flex items-center ${appointment.price ? "justify-between" : spacing.gap.small}`}>
                        <Badge className={getStatusBadgeClass(appointment.status)}>
                          {appointment.status === "confirmada" ? "Confirmada" : appointment.status === "pendiente" ? "Pendiente" : "Cancelada"}
                        </Badge>
                        {appointment.price && (
                          <p className={typography.body.base}>{appointment.price}</p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full hover:bg-gray-100 flex items-center justify-center">
                      <MoreVertical className="h-5 w-5 text-gray-600" />
                      <span className="sr-only">Más opciones para {appointment.client}</span>
                    </Button>
                  </article>
                ))}
              </ol>
            )}
          </div>
        </section>

      <Button
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
        size="icon"
        aria-label="Agregar nueva cita"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </AdminLayout>
  );
}
