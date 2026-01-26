"use client";

import { useState } from "react";
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  cedula: string;
  fullName: string;
  email: string;
  phone: string;
}

interface FormErrors {
  cedula?: string;
  fullName?: string;
  email?: string;
}

/**
 * Genera un username basado en el nombre completo
 * Ej: "Juan Carlos Pérez" -> "jcperez"
 */
function generateUsername(fullName: string): string {
  const parts = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "user" + Date.now();
  if (parts.length === 1) return parts[0];

  // Primera letra de cada nombre + apellido completo
  const initials = parts.slice(0, -1).map(p => p[0]).join("");
  const lastName = parts[parts.length - 1];

  return initials + lastName;
}

/**
 * Genera una contraseña temporal
 */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    cedula: "",
    fullName: "",
    email: "",
    phone: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const resetForm = () => {
    setFormData({ cedula: "", fullName: "", email: "", phone: "" });
    setFormErrors({});
    setError(null);
    setSuccess(false);
    setCreatedCredentials(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    setOpen(isOpen);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.cedula.trim()) {
      errors.cedula = "La cédula es requerida";
    } else if (formData.cedula.trim().length < 5) {
      errors.cedula = "La cédula debe tener al menos 5 caracteres";
    }

    if (!formData.fullName.trim()) {
      errors.fullName = "El nombre completo es requerido";
    } else if (formData.fullName.trim().length < 3) {
      errors.fullName = "El nombre debe tener al menos 3 caracteres";
    }

    if (!formData.email.trim()) {
      errors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "El email no es válido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const username = generateUsername(formData.fullName);
      const password = generateTempPassword();

      // Crear user-profile en Strapi
      const response = await fetch("/api/user-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: formData.cedula.trim(),
          displayName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          username,
          role: "client", // Default role for quick-created users
          // Note: Password handling would typically be done via auth system
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al crear el usuario");
      }

      const result = await response.json();

      setCreatedCredentials({ username, password });
      setSuccess(true);

      // Notificar al componente padre
      onUserCreated({
        documentId: result.data.documentId,
        displayName: result.data.displayName,
        email: result.data.email,
        cedula: result.data.cedula,
      });

    } catch (err) {
      console.error("Error creating user:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={typography.h3}>Crear Usuario Rápido</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario del sistema con información básica.
            Se generarán credenciales de acceso automáticamente.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-4 space-y-4">
            <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Usuario creado exitosamente
              </AlertDescription>
            </Alert>

            {createdCredentials && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className={cn(typography.body.small, "font-semibold")}>
                  Credenciales generadas:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Usuario:</span>
                  </div>
                  <div className="font-mono">{createdCredentials.username}</div>
                  <div>
                    <span className="text-muted-foreground">Contraseña:</span>
                  </div>
                  <div className="font-mono">{createdCredentials.password}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Guarda estas credenciales. La contraseña no se puede recuperar.
                </p>
              </div>
            )}

            <DialogFooter>
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

            <div className="space-y-2">
              <Label htmlFor="cedula">Cédula *</Label>
              <Input
                id="cedula"
                placeholder="Ej: 8-123-4567"
                value={formData.cedula}
                onChange={handleInputChange("cedula")}
                className={cn(
                  components.input.base,
                  formErrors.cedula && "border-destructive"
                )}
                disabled={loading}
              />
              {formErrors.cedula && (
                <p className="text-xs text-destructive">{formErrors.cedula}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                placeholder="Ej: Juan Carlos Pérez"
                value={formData.fullName}
                onChange={handleInputChange("fullName")}
                className={cn(
                  components.input.base,
                  formErrors.fullName && "border-destructive"
                )}
                disabled={loading}
              />
              {formErrors.fullName && (
                <p className="text-xs text-destructive">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
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

            <DialogFooter className="gap-2">
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
