"use client";

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from 'next/link';
import { useUser } from '@/firebase/provider';
import { SidebarProvider, SidebarInset, SidebarTrigger, Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ElectorIcon } from "@/components/icons";
import { SidebarMenuSkeleton } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";


const FullScreenSkeleton = ({ children }: { children: ReactNode }) => (
    <SidebarProvider>
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-lg pointer-events-none">
                        <ElectorIcon className="w-8 h-8 text-primary" />
                        <span className="font-headline group-data-[collapsible=icon]:hidden">
                            <Skeleton className="h-6 w-24" />
                        </span>
                    </Link>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuSkeleton showIcon />
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:h-16 sm:px-6 md:hidden">
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-6 w-24" />
                <div className="w-7" />
            </header>
            <main className="flex-1 p-4 sm:p-6">
                {children}
            </main>
        </SidebarInset>
    </SidebarProvider>
);

const GenericContentSkeleton = () => (
    <div className="space-y-6">
       <CardHeader className="p-0">
           <Skeleton className="h-9 w-64" />
           <Skeleton className="h-5 w-80 mt-2" />
       </CardHeader>
       <Card>
           <CardHeader>
             <Skeleton className="h-10 w-full" />
           </CardHeader>
           <CardContent>
             <Skeleton className="h-40 w-full" />
           </CardContent>
       </Card>
     </div>
);


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading: loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Wait until the auth state is known
    }

    const isLoginPage = pathname === "/admin/login";

    // If there's no user and we're not on the login page, redirect to login
    if (!user && !isLoginPage) {
      router.replace("/admin/login");
    }

    // If there is a user and we're on the login page, redirect to the dashboard
    if (user && isLoginPage) {
      router.replace("/admin/dashboard");
    }
  }, [user, loading, pathname, router]);

  // While loading, show the route-specific loading.tsx skeleton
  if (loading) {
    return <FullScreenSkeleton>{children}</FullScreenSkeleton>;
  }

  const isLoginPage = pathname === "/admin/login";

  // If a redirect is about to happen, show a generic skeleton to prevent content flash
  if ((!user && !isLoginPage) || (user && isLoginPage)) {
    return <FullScreenSkeleton><GenericContentSkeleton /></FullScreenSkeleton>;
  }

  // If we are on the login page (and not redirecting), show only its content
  if (isLoginPage) {
    return <>{children}</>;
  }
  
  // Otherwise, the user is logged in on a protected page, show the full layout
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
