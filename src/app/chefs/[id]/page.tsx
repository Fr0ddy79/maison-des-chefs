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

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('display_name, location, hero_image_url, cuisines, avg_rating, review_count')
    .eq('id', id)
    .single()
  
  const name = chef?.display_name || 'Chef'
  const location = chef?.location || ''
  const rating = chef?.avg_rating?.toFixed(1) || '0.0'
  const reviewCount = chef?.review_count || 0
  const cuisines = chef?.cuisines?.join(', ') || 'private chef'
  const heroImage = chef?.hero_image_url || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&h=800&fit=crop'
  
  return {
    title: `${name} — Private Chef in ${location} | Maison des Chefs`,
    description: `Book ${name}, a ${cuisines} private chef in ${location} with ${rating} stars and ${reviewCount} reviews.`,
    openGraph: {
      title: `${name} — Private Chef in ${location} | Maison des Chefs`,
      description: `Book ${name}, a ${cuisines} private chef in ${location} with ${rating} stars and ${reviewCount} reviews.`,
      type: 'profile',
      images: [{
        url: heroImage,
        width: 800,
        height: 800,
        alt: `${name} - Private Chef`,
      }],
    },
  }
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
