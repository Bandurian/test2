'use client'

import DashboardClient from '@/components/dashboard-client'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.replace('/auth/login')
          return
        }
        setUser(user)
      } catch (err) {
        router.replace('/auth/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return <DashboardClient user={user} />
}
