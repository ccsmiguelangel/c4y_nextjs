import { CookieCleaner } from "@/components/auth/cookie-cleaner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CookieCleaner />
      <div className="grid place-items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="grid grid-cols-1 max-w-xl w-full">
          {children}
        </div>
      </div>
    </>
  );
}