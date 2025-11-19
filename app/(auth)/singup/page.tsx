import { SignUpForm } from "@/components/ui/sign-up-form";
import { getSingup, getMetadata } from "@/lib/strapi";

export async function generateMetadata() {
  const singup = await getSingup();
  return getMetadata(singup || null);
}

export default async function SingUpPage() {
  const singup = await getSingup();
  if (!singup || !singup.singupForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No se pudo cargar el contenido. Por favor, verifica que el Content-Type esté publicado en Strapi.</p>
      </div>
    );
  }

  return (
    <>
      <title>{singup.title}</title>
      <meta name="description" content={singup.description} />
      <SignUpForm data={singup.singupForm} />
    </>
  );
}