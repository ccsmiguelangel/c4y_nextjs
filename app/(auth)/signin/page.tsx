import { SignInForm } from "@/components/ui/sign-in-form";
import { getSingin, getMetadata } from "@/lib/strapi";

export async function generateMetadata() {
  const singin = await getSingin();
  return getMetadata(singin || null);
}

export default async function SinginPage() {
  const singin = await getSingin();
  
  // Valores por defecto si no hay datos de Strapi
  const defaultFormData = {
    header: {
      title: "Iniciar Sesión",
      subtitle: "Ingresa tus datos para iniciar sesión en tu cuenta"
    },
    email_label: "Correo electrónico",
    email_placeholder: "Ingresa tu correo electrónico",
    password_label: "Contraseña",
    password_placeholder: "Ingresa tu contraseña",
    submit_button: "Iniciar Sesión",
    singup_previous_link_text: "¿No tienes una cuenta?",
    singup_link: [{
      href: "/signup",
      label: "Regístrate",
      isExternal: false
    }]
  };

  // Usar datos de Strapi si están disponibles, sino usar valores por defecto
  const formData = singin?.singinForm || defaultFormData;

  return (
    <>
      {singin && (
        <>
          <title>{singin.title}</title>
          <meta name="description" content={singin.description} />
          <link rel="icon" href={singin.header?.favicon?.url || "/favicon.ico"} />
        </>
      )}
      <SignInForm data={formData} />
    </>
  );
}