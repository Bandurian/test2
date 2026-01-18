'use client'

import ProfilePageClient from '@/components/profile-page-client';

import { useEffect, useRouter } from 'expo-router';
import { useState } from 'react';

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) {
    return <div>Loading...</div> // или ваш Loader
  }

  return <ProfilePageClient user={user} />
}
