"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Separator } from "@/components_shadcn/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components_shadcn/ui/toggle-group";
import { Star } from "lucide-react";
import { useState } from "react";
import { spacing, typography, commonClasses } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

export default function DashboardUserRoute() {
  const [selectedWeek, setSelectedWeek] = useState("Esta Semana");

  const weeks = ["Semana Pasada", "Esta Semana", "Próxima Semana"];

  // Datos de ejemplo para los totales
  const weeklyTotals = {
    ventas: { amount: "$150,450", change: "+5.2%", isPositive: true },
    servicios: { amount: "$25,600", change: "-1.8%", isPositive: false },
    citas: { amount: "85", change: "+10%", isPositive: true },
  };

  // Datos de ejemplo para actividad diaria
  const dailyActivity = [
    {
      day: "Lunes",
      date: 18,
      ventas: "$25,300",
      servicios: "$4,800",
      citas: 15,
      isHoliday: false,
    },
    {
      day: "Martes",
      date: 19,
      ventas: "$42,150",
      servicios: "$8,200",
      citas: 22,
      isHoliday: true,
      holidayNote: "Descuento de Feriado Aplicado",
    },
    {
      day: "Miércoles",
      date: 20,
      ventas: "$31,000",
      servicios: "$5,100",
      citas: 18,
      isHoliday: false,
    },
    {
      day: "Jueves",
      date: 21,
      ventas: "$28,500",
      servicios: "$4,500",
      citas: 14,
      isHoliday: false,
    },
    {
      day: "Viernes",
      date: 22,
      ventas: "$23,500",
      servicios: "$3,000",
      citas: 16,
      isHoliday: false,
    },
  ];

  return (
    <AdminLayout
      title="Resumen Semanal"
      showFilterAction
    >
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardContent className={`flex flex-col ${spacing.gap.base} p-6`}>
            <ToggleGroup
              type="single"
              value={selectedWeek}
              onValueChange={(value) => value && setSelectedWeek(value)}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-muted p-1"
            >
              {weeks.map((week) => (
                <ToggleGroupItem
                  key={week}
                  value={week}
                  aria-label={week}
                  className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-primary"
                >
                  <span className="truncate text-sm font-medium">{week}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className={`${typography.body.base} text-center py-1`}>18-24 Nov, 2024</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className={spacing.card.header}>
            <CardTitle className="text-base font-semibold">Totales de la Semana</CardTitle>
          </CardHeader>
          <CardContent className={`grid grid-cols-2 lg:grid-cols-3 ${spacing.gap.medium} ${spacing.card.content}`}>
            <Card className="shadow-sm ring-1 ring-inset ring-border/50">
              <CardContent className="flex flex-col gap-2 p-6">
                <p className={commonClasses.metricLabel}>Total Ventas</p>
                <p className={typography.metric.base}>{weeklyTotals.ventas.amount}</p>
                <p className={`text-sm font-medium ${
                  weeklyTotals.ventas.isPositive ? "text-green-600" : "text-red-600"
                }`}>
                  {weeklyTotals.ventas.change}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm ring-1 ring-inset ring-border/50">
              <CardContent className="flex flex-col gap-2 p-6">
                <p className={commonClasses.metricLabel}>Total Servicios</p>
                <p className={typography.metric.base}>{weeklyTotals.servicios.amount}</p>
                <p className={`text-sm font-medium ${
                  weeklyTotals.servicios.isPositive ? "text-green-600" : "text-red-600"
                }`}>
                  {weeklyTotals.servicios.change}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm ring-1 ring-inset ring-border/50 col-span-2 lg:col-span-1">
              <CardContent className="flex flex-col gap-2 p-6">
                <p className={commonClasses.metricLabel}>Citas Programadas</p>
                <p className={typography.metric.base}>{weeklyTotals.citas.amount}</p>
                <p className={`text-sm font-medium ${
                  weeklyTotals.citas.isPositive ? "text-green-600" : "text-red-600"
                }`}>
                  {weeklyTotals.citas.change}
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className={spacing.card.header}>
            <CardTitle className="text-base font-semibold">Actividad Diaria</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} ${spacing.card.content}`}>
            {dailyActivity.map((day) => (
              <Card
                key={day.day}
                className={`shadow-sm ring-1 ring-inset ring-border/50 ${
                  day.isHoliday ? "border-orange-500" : ""
                }`}
              >
                <CardContent className="p-6">
                  <CardHeader className="px-0 pt-0 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className={`${typography.h4} font-bold`}>
                        {day.day} {day.date}
                      </CardTitle>
                      {day.isHoliday && (
                        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                          <Star className="h-3 w-3 mr-1" />
                          Día Feriado
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <div className={`grid grid-cols-3 ${spacing.gap.medium} text-center`}>
                    <div className="flex flex-col">
                      <p className="text-xs text-muted-foreground uppercase">Ventas</p>
                      <p className={`${typography.body.base} font-semibold`}>{day.ventas}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-muted-foreground uppercase">Servicios</p>
                      <p className={`${typography.body.base} font-semibold`}>{day.servicios}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-muted-foreground uppercase">Citas</p>
                      <p className={`${typography.body.base} font-semibold`}>{day.citas}</p>
                    </div>
                  </div>
                  {day.isHoliday && day.holidayNote && (
                    <div className="mt-3 text-center">
                      <Separator className="mb-2" />
                      <p className="text-xs text-orange-600 font-medium">{day.holidayNote}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-center pt-4">
              <Button 
                variant="link" 
                className="h-12 px-6 text-base font-semibold text-primary no-underline hover:no-underline hover:text-primary/70 hover:scale-105 active:scale-[1.02] transition-all duration-200 ease-in-out"
              >
                Ver Más
              </Button>
            </div>
          </CardContent>
        </Card>
    </AdminLayout>
  );
}
