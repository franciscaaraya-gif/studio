"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { ElectorIcon } from "@/components/icons";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
