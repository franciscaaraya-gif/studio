"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserHook } from "@/firebase/auth/useUserHook";

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
    return <p>Cargando...</p>;
  }

  // This logic prevents a flash of the login page for authenticated users,
  // or a flash of a protected page for unauthenticated users.
  if ((!user && pathname !== "/admin/login") || (user && pathname === "/admin/login")) {
    return <p>Cargando...</p>;
  }

  return <>{children}</>;
}
