"use client"

import { useRouter } from 'expo-router'
import { useEffect } from "react"

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page - auth is handled via popup
    router.replace("/?auth=signup")
  }, [router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
