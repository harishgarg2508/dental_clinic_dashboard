import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
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
          
          {/* This wrapper div fixes the layout issue */}
          <div className="flex flex-col min-h-screen bg-gray-50">
            {/* ✅ Green Top Navbar */}
            <header className="flex h-16 shrink-0 items-center gap-2 px-4 bg-green-600 shadow-sm border-b border-green-700">
              <AppSidebar />
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Sunrise Dental Clinic and Implant Centre
                </h1>
              </div>
            </header>

            {/* ✅ Main Content Area (now expands correctly) */}
            <main className="flex-1 space-y-4 bg-white">
              {children}
            </main>
          </div>

          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}