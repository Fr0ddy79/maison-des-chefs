// Standalone booking page - avoids pages.ts complexity for cookie pre-fill
import { db } from '../db/index.js';
import { services, users, chefProfiles, bookings } from '../db/schema.js';
import { eq, gte, lte, sql, and } from 'drizzle-orm';

export default async function buildBookingPage(serviceId: number, dinerEmail: string, dinerName: string, dinerPhone: string): Promise<string> {
  // Simple query without complex joins to avoid drizzle issues
  const serviceBase = db.select({
    id: services.id,
    chefId: services.chefId,
    name: services.name,
    description: services.description,
    pricePerPerson: services.pricePerPerson,
    minGuests: services.minGuests,
    maxGuests: services.maxGuests,
  })
    .from(services)
    .where(eq(services.id, serviceId))
    .get();

  if (!serviceBase) {
    return build404Page();
  }

  // Get chef info separately
  const chef = db.select({ name: users.name })
    .from(users)
    .where(eq(users.id, serviceBase.chefId))
    .get();


  // Get chef profile for location and cuisine if available
  const chefProfile = db.select({
    location: chefProfiles.location,
    cuisineTypes: chefProfiles.cuisineTypes,
  })
    .from(chefProfiles)
    .where(eq(chefProfiles.userId, serviceBase.chefId))
    .get();

  const service = {
    ...serviceBase,
    chefName: chef?.name || 'Unknown Chef',
    chefLocation: chefProfile?.location || '',
    chefCuisineTypes: chefProfile?.cuisineTypes || '[]',
  };


  const cuisineTypes = JSON.parse(service.chefCuisineTypes || '[]');
  const cuisineList = cuisineTypes.join(', ');
  const isReturningDiner = !!dinerEmail;
  const welcomeBackHtml = isReturningDiner && dinerName
    ? `<div class="welcome-back"><span class="welcome-icon">👋</span> Welcome back, <strong>${escapeHtml(dinerName)}</strong>! Your info has been pre-filled below.</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book ${service.name} | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; }
    .page-wrapper { max-width: 900px; margin: 0 auto; padding: 7rem 2rem 3rem; }
    .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: #666; text-decoration: none; margin-bottom: 1.5rem; font-size: 0.95rem; }
    .back-link:hover { color: #c9a227; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { font-size: 2rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .page-header .chef-info { color: #666; font-size: 1rem; }
    .welcome-back { background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 1px solid #a5d6a7; color: #2e7d32; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; }
    .welcome-back .welcome-icon { font-size: 1.25rem; }
    .content-grid { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; }
    .booking-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); height: fit-content; }
    .service-summary { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .service-summary h3 { font-size: 1.1rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .service-summary p { color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .service-summary .price { font-size: 1.5rem; font-weight: 700; color: #c9a227; margin-top: 0.75rem; }
    .form-section { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .form-section h2 { font-size: 1.3rem; color: #2c3e50; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label { display: block; font-weight: 500; color: #555; margin-bottom: 0.4rem; font-size: 0.95rem; }
    .form-group label .required { color: #e53935; }
    .form-group input, .form-group textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; font-family: inherit; transition: border-color 0.2s; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #c9a227; }
    .form-group input.prefilled { background: #fff9e6; border-color: #ffe082; }
    .form-group textarea { min-height: 100px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .submit-btn { width: 100%; background: #c9a227; color: white; border: none; padding: 1rem; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .submit-btn:hover { background: #b8922a; }
    .submit-btn:disabled { background: #ccc; cursor: not-allowed; }
    .success-message { background: #e8f5e9; border: 1px solid #a5d6a7; color: #2e7d32; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; display: none; }
    .success-message.show { display: block; }
    .privacy-note { font-size: 0.85rem; color: #888; margin-top: 1rem; text-align: center; }
    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }
    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
    footer p { color: rgba(255,255,255,0.7); }
    @media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } .form-row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Maison des Chefs</a>
    <div class="nav-links">
      <a href="/services">Services</a>
      <a href="/chefs">Chefs</a>
      <a href="/auth/login">Sign In</a>
    </div>
  </nav>
  <div class="page-wrapper">
    <a href="/services/${service.id}" class="back-link">← Back to service details</a>
    <div class="page-header">
      <h1>Request Booking</h1>
      <p class="chef-info">${service.name} by ${service.chefName} • ${cuisineList}</p>
    </div>
    ${welcomeBackHtml}
    <div class="success-message" id="successMessage">
      <strong>✓ Inquiry sent successfully!</strong>
      <p style="margin-top: 0.5rem;">The chef will respond to your request shortly.</p>
    </div>
    <div class="content-grid">
      <div class="form-section">
        <h2>Your Details</h2>
        <form id="inquiryForm">
          <input type="hidden" name="serviceId" value="${service.id}">
          <div class="form-row">
            <div class="form-group">
              <label for="clientName">Your Name <span class="required">*</span></label>
              <input type="text" id="clientName" name="clientName" required value="${escapeHtml(dinerName)}" placeholder="Full name">
            </div>
            <div class="form-group">
              <label for="email">Email <span class="required">*</span></label>
              <input type="email" id="email" name="email" required value="${escapeHtml(dinerEmail)}" placeholder="you@example.com">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" name="phone" value="${escapeHtml(dinerPhone)}" placeholder="(555) 123-4567">
            </div>
            <div class="form-group">
              <label for="guestCount">Number of Guests <span class="required">*</span></label>
              <input type="number" id="guestCount" name="guestCount" required min="${service.minGuests}" max="${service.maxGuests}" value="${service.minGuests}">
            </div>
          </div>
          <div class="form-group">
            <label for="eventDate">Preferred Date</label>
            <input type="date" id="eventDate" name="eventDate" min="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label for="message">Message to Chef</label>
            <textarea id="message" name="message" placeholder="Tell the chef about your event, dietary requirements, or any special requests..."></textarea>
          </div>
          <button type="submit" class="submit-btn" id="submitBtn">Send Inquiry</button>
          <p class="privacy-note">Your information is only used to process this booking request.</p>
        </form>
      </div>
      <div class="booking-card">
        <div class="service-summary">
          <h3>${service.name}</h3>
          <p>by ${service.chefName}</p>
          <p>📍 ${service.chefLocation || 'Location TBD'}</p>
          <p>👥 ${service.minGuests}-${service.maxGuests} guests</p>
          ${service.pricePerPerson && service.pricePerPerson > 0
            ? `<div class="price">$${service.pricePerPerson}/person</div>`
            : `<div class="price">Price upon request</div>`}
        </div>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">This is a booking request. The chef will confirm availability within 24-48 hours.</p>
      </div>
    </div>
  </div>
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
  <script>
    document.querySelectorAll('input[value]').forEach(field => { if (field.value) field.classList.add('prefilled'); });
    document.getElementById('inquiryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = document.getElementById('submitBtn');
      const successMessage = document.getElementById('successMessage');
      const formData = {
        serviceId: parseInt(form.serviceId.value),
        clientName: form.clientName.value || undefined,
        email: form.email.value,
        phone: form.phone.value || undefined,
        eventDate: form.eventDate.value || undefined,
        guestCount: parseInt(form.guestCount.value) || 1,
        message: form.message.value || undefined,
      };
      if (!formData.email) { alert('Please enter your email address.'); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      try {
        const response = await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          form.style.display = 'none';
          successMessage.classList.add('show');
          successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const error = await response.json();
          alert('Error: ' + (error.error || 'Failed to submit inquiry'));
        }
      } catch (err) { alert('Network error. Please try again.'); }
      finally { submitBtn.disabled = false; submitBtn.textContent = 'Send Inquiry'; }
    });
  </script>
</body>
</html>`;
}

function build404Page(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Not Found | Maison des Chefs</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
    .error-container { text-align: center; padding: 2rem; }
    h1 { font-size: 4rem; color: #2c3e50; margin-bottom: 1rem; }
    p { color: #666; margin-bottom: 2rem; }
    a { background: #c9a227; color: white; padding: 0.875rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 600; }
    a:hover { background: #b8922a; }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>404</h1>
    <p>The service you're looking for doesn't exist.</p>
    <a href="/services">Browse Services</a>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
