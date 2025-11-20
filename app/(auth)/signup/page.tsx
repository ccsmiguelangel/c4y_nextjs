import { SignUpForm } from "@/components/ui/sign-up-form";
import { getSingup, getMetadata } from "@/lib/strapi";
import Link from "next/link";

export async function generateMetadata() {
  const singup = await getSingup();
  return getMetadata(singup || null);
}

export default async function SingUpPage() {
  const singup = await getSingup();
  if (!singup || !singup.singupForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Erorr, something went wrong.</p>
        <Link href="/" className="text-primary hover:underline font-medium">
          Go back to the home page
        </Link>
      </div>
    );
  }

  return (
    <>
      <title>{singup.title}</title>
      <meta name="description" content={singup.description} />
      <link rel="icon" href={singup.header?.favicon?.url || "/favicon.ico"} />
      <SignUpForm data={singup.singupForm} />
    </>
  );
}