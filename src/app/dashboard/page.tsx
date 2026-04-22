'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role || 'diner'
      setRole(userRole)

      if (userRole === 'admin') {
        router.push('/admin')
      } else if (userRole === 'chef') {
        router.push('/dashboard/chef')
      } else {
        router.push('/chefs')
      }
    }
    checkRole()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
      <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading dashboard...</p>
    </div>
  )
}
