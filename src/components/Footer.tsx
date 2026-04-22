import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto" style={{ backgroundColor: 'var(--color-mdc-text)', color: 'white' }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <span className="font-semibold text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
              Montreal's premier marketplace for private chef experiences. 
              Unforgettable dining in the comfort of your home.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm uppercase tracking-wider mb-4">Discover</h4>
            <ul className="space-y-3 text-sm" style={{ color: '#9ca3af' }}>
              <li><Link href="/chefs" className="hover:text-white transition-colors">Browse Chefs</Link></li>
              <li><Link href="/#experiences" className="hover:text-white transition-colors">Experiences</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-sm uppercase tracking-wider mb-4">For Chefs</h4>
            <ul className="space-y-3 text-sm" style={{ color: '#9ca3af' }}>
              <li><Link href="/chef/apply" className="hover:text-white transition-colors">Apply as a Chef</Link></li>
              <li><Link href="/signup?role=chef" className="hover:text-white transition-colors">Chef Dashboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-sm uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-3 text-sm" style={{ color: '#9ca3af' }}>
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t" style={{ borderColor: '#374151' }}>
          <p className="text-sm" style={{ color: '#6b7280' }}>© {new Date().getFullYear()} Maison des Chefs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
