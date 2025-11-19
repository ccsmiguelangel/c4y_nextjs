import { SignInForm } from "@/components/ui/sign-in-form";
import { getSingin, getMetadata } from "@/lib/strapi";

export async function generateMetadata() {
  const singin = await getSingin();
  return getMetadata(singin || null);
}

export default async function SinginPage() {
  const singin = await getSingin();
  if (!singin || !singin.singinForm) return null;

  return (
    <>
      <title>{singin.title}</title>
      <meta name="description" content={singin.description} />
      <SignInForm data={singin.singinForm} />
    </>
  );
}