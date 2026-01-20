"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { BarChart2, LogOut, Settings, Users } from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { ElectorIcon } from "@/components/icons";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Cierre de sesión exitoso." });
      router.push("/admin/login");
    } catch (error) {
      toast({ variant: "destructive", title: "Fallo al cerrar sesión.", description: "Por favor, inténtalo de nuevo." });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                <ElectorIcon className="w-8 h-8 text-primary" />
                <span className="group-data-[collapsible=icon]:hidden font-headline">E-lector</span>
            </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/admin/dashboard") || pathname.startsWith("/admin/polls")}
              tooltip="Encuestas"
            >
              <Link href="/admin/dashboard">
                <BarChart2 />
                <span>Encuestas</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/admin/groups")}
              tooltip="Grupos"
            >
              <Link href="/admin/groups">
                <Users />
                <span>Grupos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/admin/settings"}
              tooltip="Configuración"
              // @ts-ignore
              disabled
            >
              <Link href="#">
                <Settings />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar Sesión">
                    <LogOut />
                    <span>Cerrar Sesión</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
