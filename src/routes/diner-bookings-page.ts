// Standalone bookings page builder — MAI-1778 Referral Reward System
// This avoids the esbuild parsing issue in pages.ts with template literals

export default function buildDinerBookingsPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Bookings | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
    nav .nav-links a:hover { opacity: 0.8; }
    .page-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); padding: 7rem 2rem 3rem; text-align: center; color: white; }
    .page-header h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin-bottom: 0.5rem; }
    .page-header p { font-size: 1.1rem; opacity: 0.9; }
    .bookings-container { max-width: 900px; margin: 2rem auto; padding: 0 2rem; }
    .loading-state, .error-state, .empty-state, .auth-prompt { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .loading-state .spinner { width: 48px; height: 48px; border: 4px solid #f3f3f3; border-top: 4px solid #c9a227; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-state { color: #c0392b; }
    .error-state h2 { margin-bottom: 0.5rem; }
    .error-state p { color: #666; margin-bottom: 1.5rem; }
    .auth-prompt h2 { margin-bottom: 0.5rem; color: #2c3e50; }
    .auth-prompt p { color: #666; margin-bottom: 1.5rem; }
    .btn { display: inline-block; background: #c9a227; color: white; padding: 0.875rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 600; transition: background 0.2s; border: none; cursor: pointer; font-size: 1rem; }
    .btn:hover { background: #b8922a; }
    .btn-secondary { background: #6c757d; }
    .btn-secondary:hover { background: #5a6268; }
    .empty-state h2 { color: #2c3e50; margin-bottom: 0.5rem; }
    .empty-state p { color: #666; margin-bottom: 1.5rem; }
    .bookings-list { display: flex; flex-direction: column; gap: 1.5rem; }
    .booking-card { background: white; padding: 1.75rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; }
    .booking-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .booking-main { flex: 1; }
    .booking-service { font-size: 1.25rem; font-weight: 600; color: #2c3e50; margin-bottom: 0.5rem; }
    .booking-chef { color: #666; margin-bottom: 0.75rem; font-size: 0.95rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (min-width: 641px) { .booking-chef { max-width: none; } }
    .booking-details { display: flex; flex-wrap: wrap; gap: 1rem; color: #555; font-size: 0.9rem; }
    .booking-detail { display: flex; align-items: center; gap: 0.3rem; }
    .booking-updated { color: #888; font-size: 0.8rem; margin-top: 0.25rem; }
    .still-waiting { display: inline-flex; align-items: center; gap: 0.3rem; background: #fff3cd; color: #856404; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-top: 0.5rem; }
    .chef-note { background: #f8f8f8; border-left: 3px solid #c9a227; padding: 0.75rem 1rem; margin-top: 0.75rem; font-size: 0.9rem; color: #555; font-style: italic; }
    .booking-meta { text-align: right; }
    .booking-price { font-size: 1.5rem; font-weight: 700; color: #2c3e50; }
    .booking-price-label { font-size: 0.8rem; color: #888; font-weight: normal; }
    .book-again-btn { background: #c9a227; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; font-weight: 600; transition: background 0.2s; border: none; cursor: pointer; font-size: 0.9rem; display: inline-block; margin-top: 0.75rem; }
    .book-again-btn:hover { background: #b8922a; }
    .booking-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-top: 0.5rem; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-confirmed { background: #d4edda; color: #155724; }
    .status-rejected { background: #f8d7da; color: #721c24; }
    .status-completed { background: #e3f2fd; color: #1565c0; }
    .status-cancelled { background: #f1f1f1; color: #666; }
    .section-title { font-size: 1.3rem; color: #2c3e50; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #eee; }
    .upcoming-section, .past-section { margin-bottom: 2.5rem; }
    /* MAI-1778: Referral section styles */
    .referral-section { margin-bottom: 2rem; }
    .referral-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 16px; padding: 1.5rem 2rem; text-align: center; }
    .referral-title { font-size: 1.2rem; font-weight: 700; color: #15803d; margin-bottom: 0.5rem; }
    .referral-subtitle { color: #555; font-size: 0.95rem; margin-bottom: 1.25rem; }
    .referral-stats { display: flex; gap: 1.5rem; justify-content: center; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .referral-stat { text-align: center; }
    .referral-stat-value { font-size: 1.75rem; font-weight: 700; color: #15803d; }
    .referral-stat-label { font-size: 0.8rem; color: #666; }
    .credit-balance { display: inline-flex; align-items: center; gap: 0.5rem; background: white; border: 2px solid #22c55e; border-radius: 8px; padding: 0.5rem 1rem; margin-bottom: 1rem; }
    .credit-balance-label { font-size: 0.85rem; color: #666; }
    .credit-balance-amount { font-size: 1.1rem; font-weight: 700; color: #15803d; }
    .referral-code-box { display: inline-block; background: white; border: 2px dashed #22c55e; border-radius: 8px; padding: 0.5rem 1.25rem; font-size: 1.1rem; font-weight: 700; color: #15803d; letter-spacing: 0.1em; margin-bottom: 1rem; }
    .share-buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    .share-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; }
    .share-btn.copy-btn { background: #22c55e; color: white; }
    .share-btn.copy-btn:hover { background: #16a34a; }
    .share-btn.email-btn { background: #3b82f6; color: white; }
    .share-btn.email-btn:hover { background: #2563eb; }
    .share-btn.whatsapp-btn { background: #25d366; color: white; }
    .share-btn.whatsapp-btn:hover { background: #1fb855; }
    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }
    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
    footer p { color: rgba(255,255,255,0.7); }
    @media (max-width: 640px) {
      .booking-card { flex-direction: column; }
      .booking-meta { text-align: left; margin-top: 1rem; }
      .booking-details { flex-direction: column; gap: 0.5rem; }
      .booking-actions { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
      .referral-stats { gap: 1rem; }
    }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Maison des Chefs</a>
    <div class="nav-links">
      <a href="/services">Services</a>
      <a href="/diner/bookings">My Bookings</a>
      <a href="/auth/login">Sign In</a>
    </div>
  </nav>
  <div class="page-header">
    <h1>My Bookings</h1>
    <p>View and manage your culinary experiences</p>
  </div>
  <div class="bookings-container">
    <div id="loadingState" class="loading-state">
      <div class="spinner"></div>
      <p>Loading your bookings...</p>
    </div>
    <div id="authPrompt" class="auth-prompt" style="display: none;">
      <h2>Sign in to view your bookings</h2>
      <p>Access your booking history and upcoming culinary experiences</p>
      <a href="/auth/login" class="btn">Sign In</a>
    </div>
    <div id="errorState" class="error-state" style="display: none;">
      <h2>Something went wrong</h2>
      <p id="errorMessage">Unable to load your bookings. Please try again.</p>
      <button class="btn" onclick="loadBookings()">Try Again</button>
    </div>
    <div id="emptyState" class="empty-state" style="display: none;">
      <h2>No bookings yet</h2>
      <p>You haven't made any bookings yet. Start exploring culinary experiences!</p>
      <a href="/services" class="btn">Browse Services</a>
    </div>
    <div id="bookingsContent" style="display: none;">
      <!-- MAI-1778: Referral section (shown after bookings load) -->
      <div id="referralSection" class="referral-section" style="display: none;"></div>
      <div id="upcomingSection" class="upcoming-section"></div>
      <div id="pastSection" class="past-section"></div>
    </div>
  </div>
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>© 2026 Maison des Chefs. All rights reserved.</p>
  </footer>
  <script>
    var API_BASE = '';
    var referralData = null;

    async function loadBookings() {
      var loading = document.getElementById('loadingState');
      var authPrompt = document.getElementById('authPrompt');
      var errorState = document.getElementById('errorState');
      var emptyState = document.getElementById('emptyState');
      var bookingsContent = document.getElementById('bookingsContent');
      loading.style.display = 'block';
      authPrompt.style.display = 'none';
      errorState.style.display = 'none';
      emptyState.style.display = 'none';
      bookingsContent.style.display = 'none';
      try {
        var token = localStorage.getItem('token');
        if (!token) {
          loading.style.display = 'none';
          authPrompt.style.display = 'block';
          return;
        }
        var response = await fetch(API_BASE + '/bookings', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.status === 401) {
          loading.style.display = 'none';
          authPrompt.style.display = 'block';
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        var bookings = await response.json();

        // MAI-1778: Load referral data in parallel
        var referralPromise = loadReferralData(token);

        loading.style.display = 'none';
        if (!bookings || bookings.length === 0) {
          // Still show referral section even with no bookings
          await referralPromise;
          emptyState.style.display = 'block';
          bookingsContent.style.display = 'block';
          return;
        }
        renderBookings(bookings);
        await referralPromise;
        bookingsContent.style.display = 'block';
      } catch (err) {
        console.error('Error loading bookings:', err);
        loading.style.display = 'none';
        errorState.style.display = 'block';
        document.getElementById('errorMessage').textContent = err.message || 'Unable to load your bookings.';
      }
    }

    // MAI-1778: Load referral code, credits, and referral stats
    async function loadReferralData(token) {
      try {
        var res = await fetch(API_BASE + '/api/v1/diner/referral-code', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          var data = await res.json();
          referralData = data;
          renderReferralSection();
        }
      } catch(err) {
        console.warn('Could not load referral data:', err);
      }
    }

    // MAI-1778: Render referral section with code, credit balance, and share buttons
    function renderReferralSection() {
      var section = document.getElementById('referralSection');
      if (!section || !referralData) return;

      var code = referralData.code || '';
      var creditDisplay = referralData.creditBalance || '';
      var referredCount = referralData.referredCount || 0;

      var creditBlock = creditDisplay
        ? '<div class="credit-balance"><span class="credit-balance-label">Available credit:</span><span class="credit-balance-amount">' + creditDisplay + '</span></div>'
        : '';

      section.innerHTML = \`<div class="referral-card">
        <div class="referral-title">🍽️ Earn $25 — Refer a Friend</div>
        <div class="referral-subtitle">Share the experience with friends and earn credits toward your next booking.</div>
        \${creditBlock}
        \${code ? '<div class=\"referral-code-box\">' + code + '</div>' : ''}
        \${referredCount > 0 ? '<div class=\"referral-stats\"><div class=\"referral-stat\"><div class=\"referral-stat-value\">' + referredCount + '</div><div class=\"referral-stat-label\">Friends referred</div></div></div>' : ''}
        <div class="share-buttons">
          \${code ? '<a href="/referral/track?code=' + code + '&source=copy" class="share-btn copy-btn" onclick="copyReferralLink(this, \\'' + code + '\\'); return false;"><span>📋</span> Copy Link</a>' : ''}
          \${code ? '<a href="/referral/track?code=' + code + '&source=email" class="share-btn email-btn"><span>✉️</span> Email</a>' : ''}
          \${code ? '<a href="/referral/track?code=' + code + '&source=whatsapp" class="share-btn whatsapp-btn" target="_blank" rel="noopener"><span>💬</span> WhatsApp</a>' : ''}
          \${code ? '<a href="/referral/track?code=' + code + '&source=twitter" class="share-btn twitter-btn" target="_blank" rel="noopener" style="background:#1da1f2;color:white;"><span>𝕏</span> Twitter</a>' : ''}
        </div>
      </div>\`;
      section.style.display = 'block';
    }

    function copyReferralLink(btn, code) {
      var referralLink = window.location.origin + '/?ref=' + code;
      navigator.clipboard.writeText(referralLink).then(function() {
        var originalText = btn.innerHTML;
        btn.innerHTML = '<span>✓</span> Copied!';
        setTimeout(function() {
          btn.innerHTML = originalText;
        }, 2000);
        trackReferralShare('copy', code);
      }).catch(function() {
        // Fallback: show link in an alert
        alert('Your referral link: ' + referralLink);
      });
    }

    function trackReferralShare(channel, code) {
      var analyticsData = {
        event: 'referral_share',
        channel: channel,
        code: code,
        auth_status: 'authenticated',
        timestamp: new Date().toISOString()
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify(analyticsData));
      }
    }

    function renderBookings(bookings) {
      var now = new Date();
      var todayStr = now.toISOString().split('T')[0];
      var upcoming = [];
      var past = [];
      bookings.forEach(function(booking) {
        if (booking.eventDate >= todayStr && (booking.status === 'pending' || booking.status === 'confirmed')) {
          upcoming.push(booking);
        } else {
          past.push(booking);
        }
      });
      var upcomingSection = document.getElementById('upcomingSection');
      var pastSection = document.getElementById('pastSection');
      if (upcoming.length > 0) {
        upcomingSection.innerHTML = '<h2 class="section-title">Upcoming Bookings</h2>' +
          '<div class="bookings-list">' + upcoming.map(renderBookingCard).join('') + '</div>';
      } else {
        upcomingSection.innerHTML = '<h2 class="section-title">Upcoming Bookings</h2>' +
          '<p style="color: #666; text-align: center; padding: 2rem;">No upcoming bookings</p>';
      }
      if (past.length > 0) {
        pastSection.innerHTML = '<h2 class="section-title">Past Bookings</h2>' +
          '<div class="bookings-list">' + past.map(renderBookingCard).join('') + '</div>';
      } else {
        pastSection.innerHTML = '';
      }
    }
    function renderBookingCard(booking) {
      var statusClass = 'status-' + booking.status;
      var statusLabel = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
      var formattedDate = new Date(booking.eventDate).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
      });
      var formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(booking.totalPrice);
      var isBookAgainEligible = booking.status === 'completed' || booking.status === 'confirmed';
      var bookAgainBtn = isBookAgainEligible
        ? '<a href="/book/' + booking.serviceId + '?guests=' + booking.guestCount + '" class="book-again-btn">Book Again</a>'
        : '';

      // MAI-1519: Updated timestamp
      var updatedAgo = '';
      if (booking.updatedAt) {
        var updatedDate = new Date(booking.updatedAt);
        var diffMs = now - updatedDate;
        var diffMins = Math.floor(diffMs / 60000);
        var diffHours = Math.floor(diffMins / 60);
        var diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1) updatedAgo = 'Updated just now';
        else if (diffMins < 60) updatedAgo = 'Updated ' + diffMins + ' min ago';
        else if (diffHours < 24) updatedAgo = 'Updated ' + diffHours + ' hr ago';
        else if (diffDays === 1) updatedAgo = 'Updated yesterday';
        else if (diffDays < 7) updatedAgo = 'Updated ' + diffDays + ' days ago';
        else updatedAgo = 'Updated ' + Math.floor(diffDays / 7) + ' weeks ago';
      }

      // MAI-1519: Still-waiting indicator for pending > 7 days
      var stillWaiting = '';
      if (booking.status === 'pending' && booking.createdAt) {
        var createdDate = new Date(booking.createdAt);
        var ageDays = Math.floor((now - createdDate) / 86400000);
        if (ageDays > 7) {
          stillWaiting = '<div class="still-waiting">⏳ Still waiting — your inquiry is active</div>';
        }
      }

      // MAI-1519: Chef note on declined bookings
      var chefNoteHtml = '';
      if ((booking.status === 'declined' || booking.status === 'rejected') && booking.chefNote) {
        chefNoteHtml = '<div class="chef-note">"' + escapeHtml(booking.chefNote) + '"</div>';
      }

      return '<div class="booking-card">' +
        '<div class="booking-main">' +
        '<div class="booking-service">' + escapeHtml(booking.serviceName) + '</div>' +
        '<div class="booking-chef" title="' + escapeHtml(booking.chefName) + '">with ' + escapeHtml(booking.chefName) + '</div>' +
        '<div class="booking-details">' +
        '<span class="booking-detail">📅 ' + formattedDate + '</span>' +
        '<span class="booking-detail">👥 ' + booking.guestCount + ' guest' + (booking.guestCount !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        stillWaiting +
        chefNoteHtml +
        '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
        (updatedAgo ? '<div class="booking-updated">' + updatedAgo + '</div>' : '') +
        '</div>' +
        '<div class="booking-meta">' +
        '<div class="booking-price">' + formattedPrice + '</div>' +
        '<div class="booking-price-label">total</div>' +
        '</div>' +
        '<div class="booking-actions">' +
        bookAgainBtn +
        '<a href="/services/' + booking.serviceId + '" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">View Service</a>' +
        '</div>' +
        '</div>';
    }
    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    loadBookings();
  </script>
</body>
</html>`;
}