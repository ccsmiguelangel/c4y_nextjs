"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Lock } from "lucide-react";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components_shadcn/ui/avatar";
import { AdminLayout } from "@/components/admin/admin-layout";
import { typography, spacing, components } from "@/lib/design-system";

export default function ProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "Alejandro Martinez",
    email: "a.martinez@concesionario.com",
    phone: "+34 621 345 678",
  });

  const handleSaveChanges = () => {
    console.log("Guardando cambios:", formData);
    // Aquí iría la lógica para guardar los cambios
  };

  const handleChangePassword = () => {
    console.log("Cambiar contraseña");
    // Aquí iría la lógica para cambiar contraseña
  };

  const handleEditPhoto = () => {
    console.log("Editar foto de perfil");
    // Aquí iría la lógica para editar la foto
  };

  return (
    <>
      <AdminLayout
        title="Editar Perfil"
        leftActions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      >
        <div className="flex flex-col pb-28">
          {/* Profile Header */}
          <section className={`flex flex-col items-center ${spacing.gap.medium} pt-8`}>
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEoUCnZsJbwTFpyR_El5__Z8HAbBSXFTnhPepauvfWDmXj1jjzjsjJsvKgfuPE_YRTU11ILDFEruLoBr8GDwAWIutAm7xBmekhi7NfbatrtiHpuCpkP3h68kI5wpvGE5HGGPC5-Q6yEEMYU0RnDHkPtlFjYTqhvjbbguWZPxdzjimZyezKm5Y7pHQe72wGgv60bps5n47Q4PfXOwEO1J1cTfGJGFtGYmL1aVSMT73TNM0kmqMsNRohn50Dpm6qHCKRyAZd5v1C6_o"
                  alt="Alejandro Martinez profile picture"
                />
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center"
                onClick={handleEditPhoto}
              >
                <Edit className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-center">
                {formData.name}
              </p>
              <p className="text-base font-normal leading-normal text-center text-muted-foreground">
                Administrador de Ventas
              </p>
            </div>
          </section>

          {/* Form Fields */}
          <section className={`flex flex-col ${spacing.gap.small} py-3`}>
            {/* Name Field */}
            <div className="flex flex-col">
              <Label htmlFor="name" className={`pb-2 ${typography.body.large}`}>
                Nombre y Apellidos
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Alejandro Martinez"
                className={`h-14 px-[15px] text-base ${components.input.base}`}
              />
            </div>

            {/* Email Field */}
            <div className="flex flex-col mt-4">
              <Label htmlFor="email" className={`pb-2 ${typography.body.large}`}>
                Correo Electrónico
              </Label>
              <div className="flex w-full items-stretch">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  placeholder="e.g. a.martinez@concesionario.com"
                  className={`h-14 px-[15px] pr-2 text-base ${components.input.base} rounded-r-none border-r-0`}
                />
                <div className="flex h-14 items-center justify-center rounded-r-lg border border-l-0 bg-muted px-[15px]">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Phone Number Field */}
            <div className="flex flex-col mt-4">
              <Label htmlFor="phone" className={`pb-2 ${typography.body.large}`}>
                Número de Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +34 600 123 456"
                className={`h-14 px-[15px] text-base ${components.input.base}`}
              />
            </div>

            {/* Change Password Section */}
            <div className="flex flex-col mt-4">
              <Label className={`pb-2 ${typography.body.large}`}>
                Seguridad
              </Label>
              <Button
                variant="ghost"
                className="h-14 w-full bg-slate-200 dark:bg-slate-800 text-[#0d141b] dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium rounded-lg"
                onClick={handleChangePassword}
              >
                Cambiar Contraseña
              </Button>
            </div>
          </section>
        </div>
      </AdminLayout>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Button
            className={`h-14 w-full ${components.input.full} text-base font-bold`}
            onClick={handleSaveChanges}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    </>
  );
}
