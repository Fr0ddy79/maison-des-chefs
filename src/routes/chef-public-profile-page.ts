// Chef Public Profile Page - MAI-1150 Quick Share Preview
// Serves as the public preview for /chefs/:id

import { db } from '../db/index.js';
import { users, chefProfiles, services, reviews } from '../db/schema.js';
import { eq, sql, and, desc } from 'drizzle-orm';
import QRCode from 'qrcode';

export function buildChefPublicProfilePage(chefId: number): string {
  // Fetch chef data
  const chef = db.select({
    id: users.id,
    name: users.name,
    bio: chefProfiles.bio,
    cuisineTypes: chefProfiles.cuisineTypes,
    location: chefProfiles.location,
    pricePerPerson: chefProfiles.pricePerPerson,
    available: chefProfiles.available,
    verified: chefProfiles.verified,
    photoUrl: chefProfiles.photoUrl,
  })
    .from(chefProfiles)
    .innerJoin(users, eq(chefProfiles.userId, users.id))
    .where(eq(users.id, chefId))
    .get();

  if (!chef) {
    return buildErrorPage('Chef not found');
  }

  const cuisineTags = JSON.parse(chef.cuisineTypes as string || '[]');

  // Get review stats
  const reviewStats = db.select({
    count: sql<number>`count(*)`,
    avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
  })
    .from(reviews)
    .where(eq(reviews.chefId, chefId))
    .get();

  const avgRating = reviewStats ? Math.round((reviewStats.avgRating as number) * 10) / 10 : 0;
  const reviewCount = reviewStats?.count ?? 0;

  // Get top 2 services
  const topServices = db.select({
    id: services.id,
    name: services.name,
    description: services.description,
    pricePerPerson: services.pricePerPerson,
    dietaryTags: services.dietaryTags,
  })
    .from(services)
    .where(and(eq(services.chefId, chefId), eq(services.status, 'published')))
    .orderBy(desc(services.createdAt))
    .limit(2)
    .all();

  const shareUrl = `/chefs/${chefId}?preview=true&source=share`;
  const previewShareUrl = `${process.env.APP_URL || 'http://localhost:3000'}${shareUrl}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(chef.name)} | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
  nav .nav-links a:hover { opacity: 0.8; }
  .page-container { max-width: 800px; margin: 0 auto; padding: 6rem 2rem 2rem; }
  .preview-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
  .preview-hero { position: relative; width: 100%; height: 300px; background: #2c3e50; }
  .preview-hero img { width: 100%; height: 100%; object-fit: cover; }
  .preview-hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; color: rgba(255,255,255,0.3); }
  .preview-badge { position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.7); color: white; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.8rem; }
  .preview-content { padding: 2rem; }
  .preview-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
  .preview-header-info h1 { font-size: 1.8rem; color: #2c3e50; margin-bottom: 0.25rem; }
  .preview-header-info p { color: #888; margin-bottom: 0.5rem; }
  .share-btn { background: #c9a227; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
  .share-btn:hover { background: #b8922a; }
  .preview-cuisine-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
  .preview-cuisine-tag { background: #fff3e0; color: #e65100; padding: 0.3rem 0.8rem; border-radius: 16px; font-size: 0.85rem; font-weight: 500; }
  .preview-rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 1rem; }
  .preview-rating .stars { color: #ffc107; letter-spacing: 2px; }
  .preview-bio { color: #555; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .preview-experiences { margin-top: 1.5rem; }
  .preview-experiences h3 { font-size: 1.1rem; color: #2c3e50; margin-bottom: 1rem; }
  .preview-experience-card { background: #f8f9fa; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; }
  .preview-experience-card:last-child { margin-bottom: 0; }
  .preview-experience-info h4 { font-size: 1.05rem; color: #2c3e50; margin-bottom: 0.25rem; }
  .preview-experience-info p { color: #888; font-size: 0.85rem; }
  .preview-experience-price { font-size: 1.2rem; font-weight: 700; color: #2c3e50; }
  .preview-cta { display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap; }
  .preview-cta .btn { flex: 1; min-width: 200px; text-align: center; padding: 1rem; font-size: 1rem; text-decoration: none; border-radius: 6px; font-weight: 600; transition: background 0.2s; display: inline-block; }
  .preview-cta .btn-primary { background: #c9a227; color: white; }
  .preview-cta .btn-primary:hover { background: #b8922a; }
  .preview-cta .btn-secondary { background: #6c757d; color: white; }
  .preview-cta .btn-secondary:hover { background: #5a6268; }
  .verified-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: #e8f5e9; color: #2e7d32; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }
  .qr-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 300; }
  .qr-modal-overlay.visible { display: flex; }
  .qr-modal-box { background: white; border-radius: 12px; padding: 2rem; max-width: 400px; width: 90%; }
  .qr-modal-box h2 { font-size: 1.3rem; color: #2c3e50; margin-bottom: 1.5rem; text-align: center; }
  .qr-code-container { display: flex; justify-content: center; margin-bottom: 1.5rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px; }
  .qr-code-container img { max-width: 200px; max-height: 200px; }
  .qr-share-url { background: #f8f9fa; padding: 1rem; border-radius: 6px; font-size: 0.85rem; color: #555; word-break: break-all; margin-bottom: 1rem; text-align: center; }
  .qr-actions { display: flex; gap: 0.75rem; }
  .qr-actions .btn { flex: 1; text-align: center; padding: 0.75rem; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; border: none; }
  .qr-actions .btn-primary { background: #c9a227; color: white; }
  .qr-actions .btn-primary:hover { background: #b8922a; }
  .qr-actions .btn-secondary { background: #6c757d; color: white; }
  .qr-actions .btn-secondary:hover { background: #5a6268; }
  @media (max-width: 768px) { .preview-header { flex-direction: column; } .share-btn { width: 100%; justify-content: center; } .preview-hero { height: 220px; } .preview-cta { flex-direction: column; } .preview-cta .btn { min-width: unset; } }
</style>
</head>
<body>
<nav>
  <a href="/" class="logo">Maison des Chefs</a>
  <div class="nav-links">
    <a href="/chefs">Browse Chefs</a>
    <a href="/auth/login">Sign In</a>
  </div>
</nav>

<div class="page-container">
  <div class="preview-card">
    <div class="preview-hero">
      ${chef.photoUrl 
        ? `<img src="${escapeHtml(chef.photoUrl)}" alt="${escapeHtml(chef.name)}">` 
        : `<div class="preview-hero-placeholder">${getInitials(chef.name)}</div>`}
      <div class="preview-badge">Preview</div>
    </div>
    <div class="preview-content">
      <div class="preview-header">
        <div class="preview-header-info">
          <h1>${escapeHtml(chef.name)}</h1>
          <p>📍 ${escapeHtml(chef.location || 'Location not set')}</p>
          ${chef.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
        </div>
        <button class="share-btn" onclick="handleShare()">📤 Share</button>
      </div>
      <div class="preview-cuisine-tags">
        ${cuisineTags.slice(0, 4).map(tag => `<span class="preview-cuisine-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="preview-rating">
        <span class="stars">${renderStars(avgRating)}</span>
        <span>${avgRating.toFixed(1)} (${reviewCount} reviews)</span>
      </div>
      <p class="preview-bio">${escapeHtml(chef.bio || '')}</p>
      
      <div class="preview-experiences">
        <h3>Experiences</h3>
        ${topServices.length > 0 
          ? topServices.map(s => `
            <div class="preview-experience-card">
              <div class="preview-experience-info">
                <h4>${escapeHtml(s.name)}</h4>
                <p>${escapeHtml((s.description || '').substring(0, 80))}</p>
              </div>
              <div class="preview-experience-price">$${s.pricePerPerson}/person</div>
            </div>
          `).join('')
          : '<p style="color:#888;">No experiences available.</p>'
        }
      </div>
      
      <div class="preview-cta">
        <a href="/book/${topServices[0]?.id || ''}" class="btn btn-primary" id="bookingCta">Request Booking</a>
        <a href="/chefs" class="btn btn-secondary">Browse More Chefs</a>
      </div>
    </div>
  </div>
</div>

<footer>
  <div class="logo">Maison des Chefs</div>
  <p>© 2026 Maison des Chefs. All rights reserved.</p>
</footer>

<div id="qrModalOverlay" class="qr-modal-overlay" onclick="if(event.target===document.getElementById('qrModalOverlay'))closeQrModal()">
  <div class="qr-modal-box">
    <h2>Share Chef Profile</h2>
    <div class="qr-code-container" id="qrCodeContainer"><div class="spinner"></div></div>
    <div class="qr-share-url" id="qrShareUrl">${previewShareUrl}</div>
    <div class="qr-actions">
      <button class="btn btn-primary" onclick="copyShareUrl()">Copy Link</button>
      <button class="btn btn-secondary" onclick="closeQrModal()">Close</button>
    </div>
  </div>
</div>

<script>
var shareUrl = '${previewShareUrl}';
function handleShare() {
  // Check if Web Share API is available (mobile devices)
  if (navigator.share) {
    navigator.share({
      title: document.title,
      text: 'Check out this chef on Maison des Chefs!',
      url: shareUrl
    }).catch(function(err) {
      // User cancelled or share failed, fall back to QR modal
      if (err.name !== 'AbortError') {
        openQrModal();
      }
    });
  } else {
    // Desktop: show QR modal for sharing
    openQrModal();
  }
}

function openQrModal() {
  document.getElementById('qrModalOverlay').classList.add('visible');
  var container = document.getElementById('qrCodeContainer');
  container.innerHTML = '<div style="text-align:center;padding:2rem;">Generating QR...</div>';
  QRCode.toDataURL(shareUrl, { width: 200, margin: 2 }, function(err, url) {
    if (err) { container.innerHTML = '<p style="color:#c0392b;">QR code error</p>'; return; }
    container.innerHTML = '<img src="' + url + '" alt="QR Code">';
  });
}
function closeQrModal() { document.getElementById('qrModalOverlay').classList.remove('visible'); }
function copyShareUrl() {
  navigator.clipboard.writeText(shareUrl).then(function() {
    var btn = document.querySelector('.qr-actions .btn-primary');
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy Link'; }, 2000);
  });
}
</script>
</body>
</html>`;

  return html;
}

function buildErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chef Not Found | Maison des Chefs</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; }
  .error-container { max-width: 500px; margin: 8rem auto; padding: 2rem; text-align: center; }
  .error-container h1 { font-size: 2rem; color: #c0392b; margin-bottom: 1rem; }
  .error-container p { color: #666; margin-bottom: 2rem; }
  .btn { background: #c9a227; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px; font-weight: 600; }
  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }
</style>
</head>
<body>
<nav>
  <a href="/" class="logo">Maison des Chefs</a>
  <div class="nav-links">
    <a href="/chefs">Browse Chefs</a>
    <a href="/auth/login">Sign In</a>
  </div>
</nav>
<div class="error-container">
  <h1>Chef Not Found</h1>
  <p>${escapeHtml(message)}</p>
  <a href="/chefs" class="btn">Browse Chefs</a>
</div>
<footer>
  <div class="logo">Maison des Chefs</div>
  <p>© 2026 Maison des Chefs. All rights reserved.</p>
</footer>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function renderStars(rating: number): string {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? '★' : '☆';
  }
  return stars;
}