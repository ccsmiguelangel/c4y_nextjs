import { SignUpForm } from "@/components/ui/sign-up-form";
import { getSingup, getMetadata } from "@/lib/strapi";

export async function generateMetadata() {
  const singup = await getSingup();
  return getMetadata(singup || null);
}

export default async function SingUpPage() {
  const singup = await getSingup();
  
  // Valores por defecto si no hay datos de Strapi
  const defaultFormData = {
    header: {
      title: "Regístrate",
      subtitle: "Ingresa tus datos para crear una nueva cuenta"
    },
    fullname_label: "Nombre completo",
    fullname_placeholder: "Ingresa tu nombre completo",
    username_label: "Usuario",
    username_placeholder: "Ingresa tu nombre de usuario",
    email_label: "Correo electrónico",
    email_placeholder: "Ingresa tu correo electrónico",
    password_label: "Contraseña",
    password_placeholder: "Ingresa tu contraseña",
    submit_buton: "Registrarse",
    singin_previous_link_text: "¿Ya tienes una cuenta?",
    singin_link: [{
      href: "/signin",
      label: "Iniciar Sesión",
      isExternal: false
    }]
  };

  // Usar datos de Strapi si están disponibles, sino usar valores por defecto
  const formData = singup?.singupForm || defaultFormData;

  return (
    <>
      {singup && (
        <>
          <title>{singup.title}</title>
          <meta name="description" content={singup.description} />
          <link rel="icon" href={singup.header?.favicon?.url || "/favicon.ico"} />
        </>
      )}
      <SignUpForm data={formData} />
    </>
  );
}