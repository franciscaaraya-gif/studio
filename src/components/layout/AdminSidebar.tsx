"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { ElectorIcon } from "@/components/icons";

export function AdminSidebar() {
  const pathname = usePathname();

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
                <SidebarMenuButton asChild tooltip="Volver al Inicio">
                  <Link href="/">
                    <LogOut />
                    <span>Volver al Inicio</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
