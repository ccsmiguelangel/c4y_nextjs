"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components_shadcn/ui/toggle-group";
import { ArrowLeft, Sparkles } from "lucide-react";
import { spacing, typography, commonClasses } from "@/lib/design-system";

interface ContractData {
  id: string;
  clientName: string;
  clientContact: string;
  vehicleInterest: string;
  price: string;
  paymentAgreement: "semanal" | "quincenal";
  additionalClauses: string;
  discounts: Array<{
    id: string;
    title: string;
    description: string;
    amount: string;
  }>;
}

const getContractData = (id: string): ContractData | null => {
  const contracts: Record<string, ContractData> = {
    "1": {
      id: "1",
      clientName: "Ricardo Pérez",
      clientContact: "ricardo.perez@email.com / +1 555 123 4567",
      vehicleInterest: "SUV Compacto 2024",
      price: "25,500.00",
      paymentAgreement: "semanal",
      additionalClauses: "",
      discounts: [
        {
          id: "1",
          title: "Descuento por Feriado",
          description: "Se aplica un 5% de descuento sobre el valor final por el feriado del Día del Trabajo.",
          amount: "1,275.00",
        },
      ],
    },
  };

  return contracts[id] || null;
};

export default function DealDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const contractData = getContractData(id);

  const [clientName, setClientName] = useState(contractData?.clientName || "");
  const [clientContact, setClientContact] = useState(contractData?.clientContact || "");
  const [vehicleInterest, setVehicleInterest] = useState(contractData?.vehicleInterest || "");
  const [price, setPrice] = useState(contractData?.price || "");
  const [paymentAgreement, setPaymentAgreement] = useState<"semanal" | "quincenal">(
    contractData?.paymentAgreement || "semanal"
  );
  const [additionalClauses, setAdditionalClauses] = useState(contractData?.additionalClauses || "");

  if (!contractData) {
    return (
      <div className="relative flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className={typography.h3}>Editor de Contrato</h1>
            <div className="w-10" />
          </div>
        </header>
        <main className={commonClasses.mainContainer}>
          <p>Contrato no encontrado</p>
        </main>
      </div>
    );
  }

  const handleSaveDraft = () => {
    // TODO: Implementar guardado de borrador
    console.log("Guardando borrador...");
  };

  const handleGenerateContract = () => {
    // TODO: Implementar generación de contrato
    console.log("Generando contrato...");
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className={`${typography.h3} flex-1 text-center`}>Editor de Contrato</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className={`flex flex-col ${spacing.gap.xlarge}`}>
          {/* Datos del Cliente */}
          <section>
            <h2 className={`${typography.h4} mb-3`}>Datos del Cliente</h2>
            <Card className={commonClasses.card}>
              <CardContent className={`flex flex-col ${spacing.gap.medium} ${spacing.card.padding}`}>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="client-name" className={typography.label}>
                    Nombre Completo
                  </Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="rounded-lg bg-muted"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="client-contact" className={typography.label}>
                    Datos de Contacto
                  </Label>
                  <Input
                    id="client-contact"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    className="rounded-lg bg-muted"
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Detalles del Vehículo */}
          <section>
            <h2 className={`${typography.h4} mb-3`}>Detalles del Vehículo</h2>
            <Card className={commonClasses.card}>
              <CardContent className={`flex flex-col ${spacing.gap.medium} ${spacing.card.padding}`}>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="vehicle-model" className={typography.label}>
                    Vehículo de Interés
                  </Label>
                  <Input
                    id="vehicle-model"
                    value={vehicleInterest}
                    onChange={(e) => setVehicleInterest(e.target.value)}
                    className="rounded-lg bg-muted"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="price" className={typography.label}>
                    Precio (USD)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="rounded-lg bg-muted pl-7"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Términos del Contrato */}
          <section>
            <h2 className={`${typography.h4} mb-3`}>Términos del Contrato</h2>
            <Card className={commonClasses.card}>
              <CardContent className={`flex flex-col ${spacing.gap.medium} ${spacing.card.padding}`}>
                <div className="flex flex-col gap-1">
                  <Label className={typography.label}>Acuerdo de Pago</Label>
                  <ToggleGroup
                    type="single"
                    value={paymentAgreement}
                    onValueChange={(value) => {
                      if (value === "semanal" || value === "quincenal") {
                        setPaymentAgreement(value);
                      }
                    }}
                    className="mt-2"
                  >
                    <ToggleGroupItem
                      value="semanal"
                      className={`flex items-center justify-center flex-1 rounded-lg border py-2.5 text-sm font-bold transition-colors ${
                        paymentAgreement === "semanal"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Semanal
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="quincenal"
                      className={`flex items-center justify-center flex-1 rounded-lg border py-2.5 text-sm font-bold transition-colors ${
                        paymentAgreement === "quincenal"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Quincenal
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className={`${typography.body.base} font-medium`}>Cláusulas Adicionales</h3>
                  <Textarea
                    id="clauses"
                    value={additionalClauses}
                    onChange={(e) => setAdditionalClauses(e.target.value)}
                    placeholder="Añadir cláusula personalizada..."
                    rows={4}
                    className="rounded-lg bg-muted"
                  />
                  <Button
                    variant="ghost"
                    className="flex items-center justify-center gap-1.5 text-sm font-bold text-primary p-0 h-auto"
                  >
                    <Sparkles className="h-4 w-4" />
                    Añadir Cláusula
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Descuentos Aplicables */}
          {contractData.discounts.length > 0 && (
            <section>
              <h2 className={`${typography.h4} mb-3`}>Descuentos Aplicables</h2>
              {contractData.discounts.map((discount) => (
                <Card
                  key={discount.id}
                  className="rounded-xl border border-blue-200 bg-blue-50 shadow-sm"
                >
                  <CardContent className={`flex items-start gap-3 ${spacing.card.padding}`}>
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h3 className={`${typography.body.base} font-bold text-primary`}>
                        {discount.title}
                      </h3>
                      <p className={`${typography.body.small} mt-1 text-blue-800`}>
                        {discount.description}
                      </p>
                      <p className={`${typography.body.base} font-bold text-primary mt-2`}>
                        - ${discount.amount}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 border-t bg-background p-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className={`flex ${spacing.gap.base}`}>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            className="flex items-center justify-center flex-1 rounded-lg border-primary bg-background py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
          >
            Guardar Borrador
          </Button>
          <Button
            onClick={handleGenerateContract}
            className="flex items-center justify-center flex-1 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Generar Contrato
          </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
