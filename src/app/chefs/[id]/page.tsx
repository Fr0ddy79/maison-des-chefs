import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ChefProfileClient } from './ChefProfileClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getChef(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chef_profiles')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !data) {
    return null
  }
  return data
}

async function getChefServices(chefId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('chef_id', chefId)
    .eq('is_active', true)
  
  return data || []
}

async function getChefReviews(chefId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, location)')
    .eq('chef_id', chefId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  return data || []
}

export default async function ChefDetailPage({ params }: PageProps) {
  const { id } = await params
  
  const [chef, services, reviews] = await Promise.all([
    getChef(id),
    getChefServices(id),
    getChefReviews(id),
  ])

  if (!chef) {
    notFound()
  }

  return (
    <ChefProfileClient
      chef={chef}
      services={services}
      reviews={reviews}
    />
  )
}
