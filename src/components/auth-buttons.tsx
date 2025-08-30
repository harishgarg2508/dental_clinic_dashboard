"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { AuthDialog } from "@/components/auth-dialog"
import { LogIn, LogOut } from "lucide-react"
import { toast } from "sonner"

export function AuthButtons() {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success("Logged out successfully")
    } catch (error) {
      toast.error("Failed to log out")
    }
  }

  return (
    <div className="ml-auto flex bg-zinc-500 border-zinc-700 items-center space-x-2 w-24">
      {user ? (
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-white hover:bg-green-700 hover:text-white"
        >
          <LogOut className="h-5 w-5 mr-1" />
          Logout
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setIsAuthDialogOpen(true)}
          className="text-white hover:bg-green-700 hover:text-white"
        >
          <LogIn className="h-5 w-5 mr-1" />
          Login
        </Button>
      )}
      <AuthDialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
      />
    </div>
  )
}
