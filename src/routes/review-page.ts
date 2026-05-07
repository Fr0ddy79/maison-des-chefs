// Review Submission Page - MAI-1214
// Accessible via email link after completed booking
// URL: /review/:bookingId

import { db } from '../db/index.js';
import { bookings, services, users, reviews } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export default function buildReviewPage(bookingId: number, token?: string): string {
  // Fetch booking with related data
  const booking = db.select({
    id: bookings.id,
    serviceId: bookings.serviceId,
    dinerId: bookings.dinerId,
    chefId: bookings.chefId,
    eventDate: bookings.eventDate,
    status: bookings.status,
    createdAt: bookings.createdAt,
  })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .get();

  if (!booking) {
    return buildErrorPage('Booking not found');
  }

  // Check if booking is confirmed
  if (booking.status !== 'confirmed') {
    return buildErrorPage('This booking is not eligible for review. Only confirmed bookings can be reviewed.');
  }

  // Check if already reviewed
  const existingReview = db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).get();
  if (existingReview) {
    return buildAlreadyReviewedPage();
  }

  // Fetch chef name
  const chef = db.select({ name: users.name })
    .from(users)
    .where(eq(users.id, booking.chefId))
    .get();

  // Fetch service name
  const service = db.select({ name: services.name })
    .from(services)
    .where(eq(services.id, booking.serviceId))
    .get();

  // Fetch diner name for personalization
  const diner = db.select({ name: users.name })
    .from(users)
    .where(eq(users.id, booking.dinerId))
    .get();

  const chefName = chef?.name || 'Unknown Chef';
  const serviceName = service?.name || 'Unknown Service';
  const dinerName = diner?.name || 'Guest';
  const eventDate = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Review Your Experience | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; }
  .page-container { max-width: 600px; margin: 0 auto; padding: 8rem 2rem 4rem; }
  .review-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
  .review-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); color: white; padding: 2rem; text-align: center; }
  .review-header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
  .review-header p { opacity: 0.9; font-size: 1rem; }
  .review-body { padding: 2rem; }
  .booking-info { background: #f8f9fa; border-radius: 8px; padding: 1.25rem; margin-bottom: 2rem; }
  .booking-info-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
  .booking-info-row:last-child { border-bottom: none; }
  .booking-info-label { color: #888; font-size: 0.9rem; }
  .booking-info-value { font-weight: 600; color: #2c3e50; font-size: 0.95rem; }
  .form-group { margin-bottom: 1.5rem; }
  .form-group label { display: block; font-weight: 600; color: #2c3e50; margin-bottom: 0.75rem; font-size: 1rem; }
  .star-rating { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem; }
  .star-btn { background: none; border: none; font-size: 2.5rem; cursor: pointer; color: #ddd; transition: color 0.2s, transform 0.1s; padding: 0; line-height: 1; }
  .star-btn:hover { transform: scale(1.1); }
  .star-btn.active { color: #ffc107; }
  .star-btn:hover { color: #ffc107; }
  .star-rating-label { text-align: center; color: #888; font-size: 0.9rem; margin-bottom: 0.5rem; }
  .comment-area { width: 100%; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; min-height: 120px; transition: border-color 0.2s; }
  .comment-area:focus { outline: none; border-color: #c9a227; }
  .char-count { text-align: right; font-size: 0.8rem; color: #888; margin-top: 0.4rem; }
  .char-count.warning { color: #e67e22; }
  .char-count.error { color: #c0392b; }
  .submit-btn { width: 100%; background: #c9a227; color: white; padding: 1rem; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .submit-btn:hover { background: #b8922a; }
  .submit-btn:disabled { background: #ccc; cursor: not-allowed; }
  .error-msg { background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.95rem; display: none; }
  .success-msg { background: #d4edda; color: #155724; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.95rem; display: none; }
  .btn-secondary { background: #6c757d; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block; }
  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }
  @media (max-width: 768px) { .star-btn { font-size: 2rem; } }
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
  <div class="review-card">
    <div class="review-header">
      <h1>Share Your Experience</h1>
      <p>Help future diners discover amazing chefs</p>
    </div>
    <div class="review-body">
      <div id="errorMsg" class="error-msg"></div>
      <div id="successMsg" class="success-msg"></div>
      
      <div class="booking-info">
        <div class="booking-info-row">
          <span class="booking-info-label">Chef</span>
          <span class="booking-info-value">${escapeHtml(chefName)}</span>
        </div>
        <div class="booking-info-row">
          <span class="booking-info-label">Service</span>
          <span class="booking-info-value">${escapeHtml(serviceName)}</span>
        </div>
        <div class="booking-info-row">
          <span class="booking-info-label">Event Date</span>
          <span class="booking-info-value">${eventDate}</span>
        </div>
      </div>
      
      <form id="reviewForm" onsubmit="submitReview(event)">
        <div class="form-group">
          <label>Your Rating</label>
          <div class="star-rating">
            <button type="button" class="star-btn" data-rating="1">★</button>
            <button type="button" class="star-btn" data-rating="2">★</button>
            <button type="button" class="star-btn" data-rating="3">★</button>
            <button type="button" class="star-btn" data-rating="4">★</button>
            <button type="button" class="star-btn" data-rating="5">★</button>
          </div>
          <div class="star-rating-label" id="ratingLabel">Click to rate</div>
          <input type="hidden" id="ratingInput" name="rating" value="0">
        </div>
        
        <div class="form-group">
          <label for="comment">Comment (Optional)</label>
          <textarea 
            id="comment" 
            name="comment" 
            class="comment-area" 
            placeholder="Tell others about your experience with ${escapeHtml(chefName)}..."
            maxlength="1000"
            oninput="updateCharCount()"
          ></textarea>
          <div class="char-count" id="charCount">0 / 1000</div>
        </div>
        
        <button type="submit" class="submit-btn" id="submitBtn">Submit Review</button>
      </form>
    </div>
  </div>
</div>

<footer>
  <div class="logo">Maison des Chefs</div>
  <p>Montreal's premier private chef marketplace.</p>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
</footer>

<script>
var selectedRating = 0;
var API_BASE = '';
var bookingId = ${bookingId};

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Star rating interaction
var starBtns = document.querySelectorAll('.star-btn');
starBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    var rating = parseInt(this.getAttribute('data-rating'));
    selectedRating = rating;
    document.getElementById('ratingInput').value = rating;
    
    // Update visual state
    starBtns.forEach(function(b, idx) {
      if (idx < rating) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    
    // Update label
    var labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    document.getElementById('ratingLabel').textContent = labels[rating] || 'Click to rate';
  });
  
  btn.addEventListener('mouseenter', function() {
    var rating = parseInt(this.getAttribute('data-rating'));
    starBtns.forEach(function(b, idx) {
      if (idx < rating) {
        b.style.color = '#ffc107';
      }
    });
  });
  
  btn.addEventListener('mouseleave', function() {
    starBtns.forEach(function(b, idx) {
      b.style.color = '';
      if (idx >= selectedRating) {
        b.classList.remove('active');
      }
    });
  });
});

function updateCharCount() {
  var comment = document.getElementById('comment');
  var count = comment.value.length;
  var countEl = document.getElementById('charCount');
  countEl.textContent = count + ' / 1000';
  countEl.className = 'char-count';
  if (count > 900) {
    countEl.classList.add('warning');
  }
  if (count >= 1000) {
    countEl.classList.add('error');
  }
}

function showError(message) {
  var el = document.getElementById('errorMsg');
  el.textContent = message;
  el.style.display = 'block';
  window.scrollTo(0, 0);
}

function showSuccess(message) {
  var el = document.getElementById('successMsg');
  el.textContent = message;
  el.style.display = 'block';
}

async function submitReview(e) {
  e.preventDefault();
  
  var rating = parseInt(document.getElementById('ratingInput').value);
  if (rating < 1 || rating > 5) {
    showError('Please select a star rating (1-5)');
    return;
  }
  
  var comment = document.getElementById('comment').value;
  if (comment.length > 1000) {
    showError('Comment exceeds 1000 characters');
    return;
  }
  
  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  
  try {
    var response = await fetch(API_BASE + '/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: bookingId,
        rating: rating,
        comment: comment || undefined
      })
    });
    
    var data = await response.json();
    
    if (!response.ok) {
      showError(data.error || 'Failed to submit review');
      btn.disabled = false;
      btn.textContent = 'Submit Review';
      return;
    }
    
    // Success!
    showSuccess('Thank you! Your review has been submitted successfully.');
    document.getElementById('reviewForm').style.display = 'none';
    btn.textContent = 'Review Submitted';
    
    // Redirect to home after 2 seconds
    setTimeout(function() {
      window.location.href = '/';
    }, 2000);
    
  } catch (err) {
    console.error('Submit review error:', err);
    showError('Failed to submit review. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
}
</script>
</body>
</html>`;
}

function buildErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unable to Review | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; }
  .page-container { max-width: 500px; margin: 8rem auto; padding: 2rem; text-align: center; }
  .error-card { background: white; border-radius: 12px; padding: 3rem 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .error-icon { font-size: 4rem; margin-bottom: 1rem; }
  h1 { font-size: 1.8rem; color: #2c3e50; margin-bottom: 1rem; }
  p { color: #666; margin-bottom: 2rem; }
  .btn { background: #c9a227; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block; }
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
<div class="page-container">
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <h1>Unable to Submit Review</h1>
    <p>${escapeHtml(message)}</p>
    <a href="/" class="btn">Go to Homepage</a>
  </div>
</div>
<footer>
  <div class="logo">Maison des Chefs</div>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
</footer>
</body>
</html>`;
}

function buildAlreadyReviewedPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Already Reviewed | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; }
  .page-container { max-width: 500px; margin: 8rem auto; padding: 2rem; text-align: center; }
  .success-card { background: white; border-radius: 12px; padding: 3rem 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .success-icon { font-size: 4rem; margin-bottom: 1rem; }
  h1 { font-size: 1.8rem; color: #2c3e50; margin-bottom: 1rem; }
  p { color: #666; margin-bottom: 2rem; }
  .btn { background: #c9a227; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block; }
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
<div class="page-container">
  <div class="success-card">
    <div class="success-icon">✓</div>
    <h1>Review Already Submitted</h1>
    <p>Thank you for your feedback! You have already submitted a review for this booking.</p>
    <a href="/" class="btn">Go to Homepage</a>
  </div>
</div>
<footer>
  <div class="logo">Maison des Chefs</div>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
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
