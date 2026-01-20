"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import useUser from "@/firebase/auth/useUser";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser(); // 👈 AQUÍ estaba el bug
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [user, pathname, router]);

  if (!user && pathname !== "/admin/login") {
    return <p>Cargando...</p>;
  }

  return <>{children}</>;
}
