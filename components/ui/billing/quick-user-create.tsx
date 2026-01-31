"use client";

import { useState } from "react";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Calendar, MapPin, Phone, Mail, User, Briefcase, Car, Contact, Linkedin, Clock } from "lucide-react";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components_shadcn/ui/dialog";
import { Alert, AlertDescription } from "@/components_shadcn/ui/alert";
import { typography, components } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components_shadcn/ui/tabs";

interface QuickUserCreateProps {
  onUserCreated: (user: CreatedUser) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export interface CreatedUser {
  documentId: string;
  displayName: string;
  email: string;
  cedula: string;
}

interface FormData {
  // Información básica (mandatoria)
  identificationNumber: string;
  displayName: string;
  email: string;
  address: string;
  // Información de contacto adicional
  phone: string;
  // Información personal
  dateOfBirth: string;
  // Información laboral
  department: string;
  role: string;
  workSchedule: string;
  hireDate: string;
  specialties: string;
  // Contacto de emergencia
  emergencyContactName: string;
  emergencyContactPhone: string;
  // Información adicional
  linkedin: string;
  driverLicense: string;
  bio: string;
}

interface FormErrors {
  identificationNumber?: string;
  displayName?: string;
  email?: string;
  address?: string;
}

export function QuickUserCreate({
  onUserCreated,
  trigger,
  className,
}: QuickUserCreateProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  const [formData, setFormData] = useState<FormData>({
    identificationNumber: "",
    displayName: "",
    email: "",
    address: "",
    phone: "",
    dateOfBirth: "",
    department: "",
    role: "driver",
    workSchedule: "",
    hireDate: "",
    specialties: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    linkedin: "",
    driverLicense: "",
    bio: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const resetForm = () => {
    setFormData({
      identificationNumber: "",
      displayName: "",
      email: "",
      address: "",
      phone: "",
      dateOfBirth: "",
      department: "",
      role: "driver",
      workSchedule: "",
      hireDate: "",
      specialties: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      linkedin: "",
      driverLicense: "",
      bio: "",
    });
    setFormErrors({});
    setError(null);
    setSuccess(false);
    setActiveTab("basic");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    setOpen(isOpen);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.identificationNumber.trim()) {
      errors.identificationNumber = "La cédula es requerida";
    } else if (formData.identificationNumber.trim().length < 5) {
      errors.identificationNumber = "La cédula debe tener al menos 5 caracteres";
    }

    if (!formData.displayName.trim()) {
      errors.displayName = "El nombre completo es requerido";
    } else if (formData.displayName.trim().length < 3) {
      errors.displayName = "El nombre debe tener al menos 3 caracteres";
    }

    if (!formData.email.trim()) {
      errors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "El email no es válido";
    }

    if (!formData.address.trim()) {
      errors.address = "La dirección es requerida";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setActiveTab("basic");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Crear user-profile en Strapi con todos los campos válidos
      // Nota: username y password no existen en user-profile, son del modelo User de auth
      const response = await fetch("/api/user-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            identificationNumber: formData.identificationNumber.trim(),
            displayName: formData.displayName.trim(),
            email: formData.email.trim(),
            address: formData.address.trim(),
            phone: formData.phone.trim() || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            department: formData.department.trim() || undefined,
            role: formData.role || "client",
            workSchedule: formData.workSchedule.trim() || undefined,
            hireDate: formData.hireDate || undefined,
            specialties: formData.specialties.trim() || undefined,
            emergencyContactName: formData.emergencyContactName.trim() || undefined,
            emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
            linkedin: formData.linkedin.trim() || undefined,
            driverLicense: formData.driverLicense.trim() || undefined,
            bio: formData.bio.trim() || undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al crear el usuario");
      }

      const result = await response.json();

      setSuccess(true);

      // Notificar al componente padre
      onUserCreated({
        documentId: result.data.documentId,
        displayName: result.data.displayName,
        email: result.data.email,
        cedula: result.data.identificationNumber || result.data.cedula,
      });

    } catch (err) {
      console.error("Error creating user:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            <UserPlus className="h-4 w-4" />
            Crear Usuario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className={typography.h3}>Crear Usuario Rápido</DialogTitle>
          <DialogDescription>
            Crea un nuevo perfil de usuario en el sistema. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 space-y-4">
            <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Usuario creado exitosamente
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <p className={cn(typography.body.small, "font-semibold")}>
                Información del usuario creado:
              </p>
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{formData.displayName}</span>
                
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{formData.email}</span>
                
                <span className="text-muted-foreground">Cédula:</span>
                <span className="font-medium">{formData.identificationNumber}</span>
                
                <span className="text-muted-foreground">Dirección:</span>
                <span className="font-medium">{formData.address}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                El perfil de usuario ha sido creado. Para asignar credenciales de acceso, contacte al administrador del sistema.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básica *</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="additional">Adicional</TabsTrigger>
              </TabsList>

              {/* Tab: Información Básica (Mandatoria) */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Cédula / Identificación */}
                <div className="space-y-2">
                  <Label htmlFor="identificationNumber" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Cédula / Identificación *
                  </Label>
                  <Input
                    id="identificationNumber"
                    placeholder="Ej: 8-123-4567"
                    value={formData.identificationNumber}
                    onChange={handleInputChange("identificationNumber")}
                    className={cn(
                      components.input.base,
                      formErrors.identificationNumber && "border-destructive"
                    )}
                    disabled={loading}
                  />
                  {formErrors.identificationNumber && (
                    <p className="text-xs text-destructive">{formErrors.identificationNumber}</p>
                  )}
                </div>

                {/* Nombre Completo */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Nombre Completo *
                  </Label>
                  <Input
                    id="displayName"
                    placeholder="Ej: Juan Carlos Pérez"
                    value={formData.displayName}
                    onChange={handleInputChange("displayName")}
                    className={cn(
                      components.input.base,
                      formErrors.displayName && "border-destructive"
                    )}
                    disabled={loading}
                  />
                  {formErrors.displayName && (
                    <p className="text-xs text-destructive">{formErrors.displayName}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ej: juan@email.com"
                    value={formData.email}
                    onChange={handleInputChange("email")}
                    className={cn(
                      components.input.base,
                      formErrors.email && "border-destructive"
                    )}
                    disabled={loading}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-destructive">{formErrors.email}</p>
                  )}
                </div>

                {/* Dirección */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Dirección *
                  </Label>
                  <Input
                    id="address"
                    placeholder="Ej: Calle 50, Edificio Bay View, Apartamento 4B"
                    value={formData.address}
                    onChange={handleInputChange("address")}
                    className={cn(
                      components.input.base,
                      formErrors.address && "border-destructive"
                    )}
                    disabled={loading}
                  />
                  {formErrors.address && (
                    <p className="text-xs text-destructive">{formErrors.address}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ej: 6000-0000"
                    value={formData.phone}
                    onChange={handleInputChange("phone")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>
              </TabsContent>

              {/* Tab: Información Personal */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                {/* Fecha de Nacimiento */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Fecha de Nacimiento
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange("dateOfBirth")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>

                {/* Licencia de Conducir */}
                <div className="space-y-2">
                  <Label htmlFor="driverLicense" className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    Licencia de Conducir
                  </Label>
                  <Input
                    id="driverLicense"
                    placeholder="Ej: B-12345678"
                    value={formData.driverLicense}
                    onChange={handleInputChange("driverLicense")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>

                {/* Biografía */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">📝</span>
                    Biografía / Notas
                  </Label>
                  <textarea
                    id="bio"
                    rows={3}
                    placeholder="Información adicional sobre el usuario..."
                    value={formData.bio}
                    onChange={handleInputChange("bio")}
                    className={cn(
                      "w-full px-3 py-2 text-sm rounded-md border border-input bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    )}
                    disabled={loading}
                  />
                </div>

                {/* Contacto de Emergencia */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Contact className="h-4 w-4" />
                    Contacto de Emergencia
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName" className="text-sm">
                      Nombre del Contacto
                    </Label>
                    <Input
                      id="emergencyContactName"
                      placeholder="Ej: María Pérez"
                      value={formData.emergencyContactName}
                      onChange={handleInputChange("emergencyContactName")}
                      className={components.input.base}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone" className="text-sm">
                      Teléfono del Contacto
                    </Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      placeholder="Ej: 6123-4567"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange("emergencyContactPhone")}
                      className={components.input.base}
                      disabled={loading}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Información Adicional */}
              <TabsContent value="additional" className="space-y-4 mt-4">
                {/* Departamento */}
                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Departamento
                  </Label>
                  <Input
                    id="department"
                    placeholder="Ej: Ventas, Operaciones, Administración"
                    value={formData.department}
                    onChange={handleInputChange("department")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>

                {/* Rol */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Rol
                  </Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={handleInputChange("role")}
                    className={cn(
                      "w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    disabled={loading}
                  >
                    <option value="driver">Conductor</option>
                    <option value="seller">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* Horario de Trabajo */}
                <div className="space-y-2">
                  <Label htmlFor="workSchedule" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Horario de Trabajo
                  </Label>
                  <Input
                    id="workSchedule"
                    placeholder="Ej: Lunes a Viernes 8:00 - 17:00"
                    value={formData.workSchedule}
                    onChange={handleInputChange("workSchedule")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>

                {/* Fecha de Contratación */}
                <div className="space-y-2">
                  <Label htmlFor="hireDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Fecha de Contratación
                  </Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={handleInputChange("hireDate")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>

                {/* Especialidades */}
                <div className="space-y-2">
                  <Label htmlFor="specialties" className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">⭐</span>
                    Especialidades
                  </Label>
                  <Input
                    id="specialties"
                    placeholder="Ej: Ventas de autos, Financiamiento, Servicio al cliente"
                    value={formData.specialties}
                    onChange={handleInputChange("specialties")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>

                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="Ej: https://linkedin.com/in/usuario"
                    value={formData.linkedin}
                    onChange={handleInputChange("linkedin")}
                    className={components.input.base}
                    disabled={loading}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Crear Usuario
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default QuickUserCreate;
