import { getDashboard, getMetadata } from "@/lib/strapi";
import { HeroSection } from "@/components/ui/hero-section"; 
import { Nextjs404Page } from "@/components/ui/nextjs-404-page";

export async function generateMetadata() {
  const dashboard = await getDashboard();
  return getMetadata(dashboard || null);
} 

export default async function Home() {
  const dashboard = await getDashboard();
  if (!dashboard || !dashboard.sections[0]) return <Nextjs404Page title="404 - Page Not Found" description="The page you are looking for does not exist." />;
  
  return (
    <>
      <title>{dashboard.title}</title>
      <meta name="description" content={dashboard.description} />
      <link rel="icon" href={dashboard.favicon?.url || "/favicon.ico"} />
      <HeroSection data={dashboard.sections[0]} />
    </>
  );
}