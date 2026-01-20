"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { ElectorIcon } from "@/components/icons";
import { useUser } from "@/firebase";

function AdminLoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <ElectorIcon className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-muted-foreground">Cargando...</p>
        </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait until loading is false
    
    // If not logged in and not on the login page, redirect to login
    if (!user && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
    // If logged in and on the login page, redirect to dashboard
    else if (user && pathname === '/admin/login') {
      router.replace('/admin/dashboard');
    }
  }, [user, loading, pathname, router]);
  
  // Show a loading screen during auth check or while redirecting
  if (loading || (!user && pathname !== '/admin/login') || (user && pathname === '/admin/login')) {
    return <AdminLoadingScreen />;
  }

  // Render children for the login page without the main layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Render the main admin layout for authenticated users
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
