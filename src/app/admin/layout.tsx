"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/firebase";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ElectorIcon } from "@/components/icons";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // This effect handles routing based on auth state.
    if (isUserLoading) return; // Wait until loading is done.

    // If logged in and on login page, redirect to dashboard.
    if (user && isLoginPage) {
      router.replace('/admin/dashboard');
    }
    
    // If not logged in and not on the login page, redirect to login.
    if (!user && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [isUserLoading, user, isLoginPage, router]);

  // While auth state is loading, or while redirecting, show a loader.
  // This is the "strict" gatekeeper. It prevents any UI flash.
  if (isUserLoading || (user && isLoginPage) || (!user && !isLoginPage)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we are on the login page and not logged in, show the login form.
  if (isLoginPage && !user) {
    return <>{children}</>;
  }
  
  // If we are on a protected page and logged in, show the admin layout.
  if (!isLoginPage && user) {
    return (
      <SidebarProvider>
          <AdminSidebar />
          <div className="flex w-full flex-col">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                  <SidebarTrigger className="h-8 w-8" />
                  <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
                      <ElectorIcon className="h-8 w-8 text-primary" />
                      <span className="font-headline text-lg">E-lector</span>
                  </Link>
              </header>
              <main className="flex-1 p-4 sm:p-6 md:p-8">
                  {children}
              </main>
          </div>
      </SidebarProvider>
    );
  }

  // Fallback for any other weird state.
  return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
  );
}
