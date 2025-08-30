"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { AuthDialog } from "./auth-dialog"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowAuth(true)
    }
  }, [user, loading])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <>
      {user ? children : null}
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </>
  )
}
