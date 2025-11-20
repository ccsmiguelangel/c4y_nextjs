import { MaintenancePage } from "@/components/ui/maintenance-page";

export async function generateMetadata() {
  return {
    title: "Under Maintenance - Coming Soon",
    description: "We're working on something amazing. Check back soon!",
  };
} 

export default async function Home() {
  return <MaintenancePage />;
}