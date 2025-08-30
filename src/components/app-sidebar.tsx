"use client"

import type React from "react"
import {
  Calendar,
  Home,
  Users,
  FileText,
  Settings,
  DollarSign,
  X,
  Menu,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Add Patient", url: "/patients/add", icon: FileText },
  { title: "Billing", url: "/billing", icon: DollarSign },
  { title: "Reports", url: "/reports", icon: Calendar },
  { title: "Settings", url: "/settings", icon: Settings },
]


export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success("Logged out successfully")
    } catch (error) {
      toast.error("Failed to log out")
    }
  }

  // Effect to handle clicks outside the drawer to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Effect to handle the 'Escape' key to close the drawer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])


  return (
    <>
      {/* The trigger button that will be in the navbar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="p-3 w-10 h-10 bg-white text-gray-800 border border-gray-300 rounded-md hover:bg-gray-100 hover:border-gray-400 transition"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open Menu</span>
      </Button>

      {/* The backdrop that covers the page when the drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* The Drawer/Sidebar itself */}
      <aside
        ref={drawerRef}
        className={`fixed top-0 left-0 h-full w-64 bg-white text-slate-800 border-r border-slate-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Dental Clinic 🦷</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 border border-slate-400 text-slate-700 hover:bg-slate-200 rounded-md transition"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.url}
                  onClick={() => setIsOpen(false)} // Close drawer on link click
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-200 space-y-4">
          <Button 
            variant="ghost" 
            className="w-full flex items-center gap-2 justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
          <p className="text-sm text-slate-500 text-center">© 2025 Harish Garg</p>
        </div>
      </aside>
    </>
  )
}
