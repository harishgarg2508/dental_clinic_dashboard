"use client"

import {
  Calendar,
  Home,
  Users,
  FileText,
  Settings,
  DollarSign,
  X,
} from "lucide-react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Add Patient", url: "/patients/add", icon: FileText },
  { title: "Billing", url: "/billing", icon: DollarSign },
  { title: "Reports", url: "/reports", icon: Calendar },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const { isOpen, setOpen } = useSidebar()
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, setOpen])

  return (
    <Sidebar
      ref={sidebarRef}
      className="bg-white text-slate-800 border-r border-slate-200 shadow-xl z-50"
      collapsible="offcanvas"
    >
      <SidebarHeader>
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-bold text-slate-900">Dental Clinic 🦷</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-8 w-8 border border-slate-400 text-slate-700 hover:bg-slate-200 rounded-md transition"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 text-sm text-slate-500">© 2025 Harish Garg</div>
      </SidebarFooter>
    </Sidebar>
  )
}
