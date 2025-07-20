import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dental Clinic Management System",
  description: "Complete dental clinic management with patient records and billing",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset>
              {/* ✅ Green Navbar */}
              <header className="flex h-16 shrink-0 items-center gap-2 px-4 bg-green-600 shadow-sm border-b border-green-700">
                {/* ✅ Dark Icon + Border */}
                <SidebarTrigger className="p-3 w-10 h-10 bg-white text-gray-800 border border-gray-300 rounded-md hover:bg-gray-100 hover:border-gray-400 transition" />
                <div className="ml-4">
                  <h1 className="text-xl font-semibold text-white">Sunrise Dental Clinic</h1>
                </div>
              </header>

              {/* ✅ Main content area */}
              <main className="flex-1 space-y-4 p-8 pt-6 bg-white">{children}</main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
