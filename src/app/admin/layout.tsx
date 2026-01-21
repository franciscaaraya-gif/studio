"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from 'next/link';
import { useUserHook } from "@/firebase/auth/useUserHook";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ElectorIcon } from "@/components/icons";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUserHook();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Do nothing while loading
    }
    
    // If the user is logged in and on the login page, redirect to the dashboard
    if (user && pathname === "/admin/login") {
      router.replace("/admin/dashboard");
    }
    
    // If the user is not logged in and not on the login page, redirect to login
    if (!user && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
        <div className="flex h-dvh items-center justify-center">
            <p>Cargando...</p>
        </div>
    );
  }

  // This logic prevents a flash of the login page for authenticated users,
  // or a flash of a protected page for unauthenticated users.
  if ((!user && pathname !== "/admin/login") || (user && pathname === "/admin/login")) {
    return (
        <div className="flex h-dvh items-center justify-center">
            <p>Cargando...</p>
        </div>
    );
  }

  // If on login page, don't show the sidebar layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }
  
  // For all other admin pages, show the sidebar layout
  return (
    <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:h-16 sm:px-6 md:hidden">
                <SidebarTrigger />
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
                    <ElectorIcon className="h-6 w-6 text-primary" />
                    <span className="font-headline">E-lector</span>
                </Link>
                <div className="w-7" /> {/* Spacer to balance the trigger button */}
            </header>
            <main className="flex-1 p-4 sm:p-6">
                {children}
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
