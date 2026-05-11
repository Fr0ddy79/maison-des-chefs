// Standalone notifications page builder for MAI-1212

export default function buildNotificationsPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notifications | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; align-items: center; }
    nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
    nav .nav-links a:hover { opacity: 0.8; }
    .bell-btn { background: none; border: none; cursor: pointer; position: relative; padding: 0.5rem; display: flex; align-items: center; }
    .bell-btn svg { width: 24px; height: 24px; fill: white; transition: opacity 0.2s; }
    .bell-btn:hover svg { opacity: 0.8; }
    .bell-badge { position: absolute; top: 2px; right: 2px; background: #e74c3c; color: white; font-size: 0.65rem; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
    .notification-dropdown { position: absolute; top: 100%; right: -10px; width: 340px; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 200; display: none; overflow: hidden; }
    .notification-dropdown.open { display: block; }
    .notification-dropdown-header { padding: 0.75rem 1rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    .notification-dropdown-header span { font-weight: 600; color: #2c3e50; font-size: 0.9rem; }
    .mark-all-read-btn { background: none; border: none; color: #c9a227; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
    .mark-all-read-btn:hover { text-decoration: underline; }
    .notification-list { max-height: 320px; overflow-y: auto; }
    .notification-item { padding: 1rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.15s; }
    .notification-item:hover { background: #f8f9fa; }
    .notification-item:last-child { border-bottom: none; }
    .notification-item.unread { background: #fafafa; }
    .notification-item.unread .notif-title { font-weight: 700; }
    .notif-title { font-size: 0.95rem; color: #2c3e50; margin-bottom: 0.25rem; }
    .notif-body { font-size: 0.85rem; color: #666; margin-bottom: 0.25rem; }
    .notif-time { font-size: 0.75rem; color: #999; }
    .notif-icon { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 0.75rem; font-size: 1rem; flex-shrink: 0; }
    .notif-icon-confirmed { background: #d4edda; }
    .notif-icon-declined { background: #f8d7da; }
    .notif-icon-completed { background: #e3f2fd; }
    .notif-icon-review { background: #fff3cd; }
    .notif-row { display: flex; align-items: flex-start; }
    .notif-content { flex: 1; }
    .page-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); padding: 7rem 2rem 3rem; text-align: center; color: white; }
    .page-header h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin-bottom: 0.5rem; }
    .page-header p { font-size: 1.1rem; opacity: 0.9; }
    .notifs-container { max-width: 700px; margin: 2rem auto; padding: 0 2rem; }
    .loading-state, .error-state, .empty-state, .auth-prompt { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .loading-state .spinner { width: 48px; height: 48px; border: 4px solid #f3f3f3; border-top: 4px solid #c9a227; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-state { color: #c0392b; }
    .auth-prompt h2, .empty-state h2 { color: #2c3e50; margin-bottom: 0.5rem; }
    .auth-prompt p, .empty-state p { color: #666; margin-bottom: 1.5rem; }
    .btn { display: inline-block; background: #c9a227; color: white; padding: 0.875rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 600; transition: background 0.2s; border: none; cursor: pointer; font-size: 1rem; }
    .btn:hover { background: #b8922a; }
    .notifs-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .notif-card { background: white; padding: 1.25rem 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; align-items: flex-start; gap: 1rem; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
    .notif-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .notif-card.unread { border-left: 3px solid #c9a227; }
    .notif-card.read { opacity: 0.7; }
    .mark-all-bar { text-align: right; margin-bottom: 1rem; }
    .mark-all-bar button { background: none; border: none; color: #c9a227; font-size: 0.9rem; cursor: pointer; font-weight: 600; }
    .mark-all-bar button:hover { text-decoration: underline; }
    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }
    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
    footer p { color: rgba(255,255,255,0.7); }
    @media (max-width: 640px) {
      .notification-dropdown { width: calc(100vw - 2rem); right: -1rem; }
    }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Maison des Chefs</a>
    <div class="nav-links">
      <a href="/services">Services</a>
      <a href="/diner/bookings">My Bookings</a>
      <a href="/notifications">Notifications</a>
      <a href="/auth/login">Sign In</a>
      <button class="bell-btn" id="bellBtn" onclick="toggleDropdown(event)" style="display:none;">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
        <span class="bell-badge" id="bellBadge" style="display:none;">0</span>
      </button>
    </div>
  </nav>

  <div class="notification-dropdown" id="notifDropdown">
    <div class="notification-dropdown-header">
      <span>Notifications</span>
      <button class="mark-all-read-btn" onclick="markAllRead(event)">Mark all read</button>
    </div>
    <div class="notification-list" id="dropdownNotifList">
      <div style="padding:1.5rem;text-align:center;color:#999;font-size:0.9rem;">Loading...</div>
    </div>
  </div>

  <div class="page-header">
    <h1>Notifications</h1>
    <p>Stay updated on your bookings and culinary experiences</p>
  </div>
  <div class="notifs-container">
    <div id="loadingState" class="loading-state">
      <div class="spinner"></div>
      <p>Loading your notifications...</p>
    </div>
    <div id="authPrompt" class="auth-prompt" style="display: none;">
      <h2>Sign in to view notifications</h2>
      <p>Get updates on your booking requests and confirmations</p>
      <a href="/auth/login" class="btn">Sign In</a>
    </div>
    <div id="errorState" class="error-state" style="display: none;">
      <h2>Something went wrong</h2>
      <p>Unable to load notifications.</p>
      <button class="btn" onclick="loadNotifications()">Try Again</button>
    </div>
    <div id="emptyState" class="empty-state" style="display: none;">
      <h2>No notifications yet</h2>
      <p>You'll receive updates about your bookings here.</p>
    </div>
    <div id="notifsContent" style="display: none;">
      <div class="mark-all-bar" id="markAllBar" style="display:none;">
        <button onclick="markAllReadFromPage(event)">Mark all as read</button>
      </div>
      <div class="notifs-list" id="notifsList"></div>
    </div>
  </div>
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>© 2026 Maison des Chefs. All rights reserved.</p>
  </footer>
  <script>
    var API_BASE = '';
    var unreadCount = 0;

    function escapeHtml(text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function formatTime(dateStr) {
      var date = new Date(dateStr);
      var now = new Date();
      var diff = now - date;
      var minutes = Math.floor(diff / 60000);
      var hours = Math.floor(diff / 3600000);
      var days = Math.floor(diff / 86400000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return minutes + 'm ago';
      if (hours < 24) return hours + 'h ago';
      if (days < 7) return days + 'd ago';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function getNotifIcon(type) {
      if (type === 'booking_confirmed') return '<div class="notif-icon notif-icon-confirmed">✓</div>';
      if (type === 'booking_declined') return '<div class="notif-icon notif-icon-declined">✗</div>';
      if (type === 'booking_completed') return '<div class="notif-icon notif-icon-completed">★</div>';
      if (type === 'review_request') return '<div class="notif-icon notif-icon-review">★</div>';
      return '<div class="notif-icon notif-icon-confirmed">•</div>';
    }

    function renderDropdownNotif(n) {
      return '<div class="notification-item ' + (n.read ? '' : 'unread') + '" onclick="handleNotifClick(event, ' + n.id + ', ' + JSON.stringify(n.metadata || {}).replace(/'/g, "\\'") + ')">' +
        '<div class="notif-row">' + getNotifIcon(n.type) +
        '<div class="notif-content">' +
        '<div class="notif-title">' + escapeHtml(n.title) + '</div>' +
        '<div class="notif-body">' + escapeHtml(n.body) + '</div>' +
        '<div class="notif-time">' + formatTime(n.createdAt) + '</div></div></div></div>';
    }

    function renderPageNotif(n) {
      return '<div class="notif-card ' + (n.read ? 'read' : 'unread') + '" onclick="handleNotifClick(event, ' + n.id + ', ' + JSON.stringify(n.metadata || {}).replace(/'/g, "\\'") + ')">' +
        getNotifIcon(n.type) +
        '<div style="flex:1;">' +
        '<div class="notif-title" style="margin-bottom:0.25rem;">' + escapeHtml(n.title) + '</div>' +
        '<div class="notif-body">' + escapeHtml(n.body) + '</div>' +
        '<div class="notif-time">' + formatTime(n.createdAt) + '</div></div></div>';
    }

    function handleNotifClick(e, id, metadata) {
      e.stopPropagation();
      markRead(id);
      if (metadata && metadata.bookingId) {
        window.location.href = '/bookings?highlight=' + metadata.bookingId;
      }
    }

    async function markRead(id) {
      try {
        var token = localStorage.getItem('token');
        await fetch(API_BASE + '/api/notifications/' + id + '/read', {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token }
        });
      } catch (err) { console.error('Error marking read:', err); }
    }

    async function markAllRead(e) {
      e.stopPropagation();
      try {
        var token = localStorage.getItem('token');
        await fetch(API_BASE + '/api/notifications/mark-all-read', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        closeDropdown();
        loadNotifications();
        updateBadge(0);
      } catch (err) { console.error('Error marking all read:', err); }
    }

    function markAllReadFromPage(e) {
      e.stopPropagation();
      markAllRead(e);
    }

    function toggleDropdown(e) {
      e.stopPropagation();
      var dropdown = document.getElementById('notifDropdown');
      if (dropdown.classList.contains('open')) {
        closeDropdown();
      } else {
        dropdown.classList.add('open');
        loadDropdownNotifications();
      }
    }

    function closeDropdown() {
      document.getElementById('notifDropdown').classList.remove('open');
    }

    async function updateBadge(count) {
      unreadCount = count;
      var badge = document.getElementById('bellBadge');
      var bellBtn = document.getElementById('bellBtn');
      if (badge && bellBtn) {
        if (count > 0) {
          badge.textContent = count > 9 ? '9+' : count;
          badge.style.display = 'flex';
          bellBtn.style.display = 'flex';
        } else {
          badge.style.display = 'none';
          bellBtn.style.display = localStorage.getItem('token') ? 'flex' : 'none';
        }
      }
    }

    async function loadDropdownNotifications() {
      try {
        var token = localStorage.getItem('token');
        if (!token) return;
        var response = await fetch(API_BASE + '/api/notifications', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) return;
        var notifs = await response.json();
        var unread = notifs.filter(function(n) { return !n.read; });
        var list = document.getElementById('dropdownNotifList');
        if (unread.length === 0) {
          list.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#999;font-size:0.9rem;">No unread notifications</div>';
        } else {
          list.innerHTML = unread.slice(0, 5).map(renderDropdownNotif).join('');
        }
      } catch (err) { console.error('Error loading dropdown:', err); }
    }

    async function loadNotifications() {
      var loading = document.getElementById('loadingState');
      var authPrompt = document.getElementById('authPrompt');
      var errorState = document.getElementById('errorState');
      var emptyState = document.getElementById('emptyState');
      var notifsContent = document.getElementById('notifsContent');

      loading.style.display = 'block';
      authPrompt.style.display = 'none';
      errorState.style.display = 'none';
      emptyState.style.display = 'none';
      notifsContent.style.display = 'none';

      try {
        var token = localStorage.getItem('token');
        if (!token) {
          loading.style.display = 'none';
          authPrompt.style.display = 'block';
          document.getElementById('bellBtn').style.display = 'none';
          return;
        }

        var response = await fetch(API_BASE + '/api/notifications', {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.status === 401) {
          loading.style.display = 'none';
          authPrompt.style.display = 'block';
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch');

        var notifs = await response.json();
        loading.style.display = 'none';

        var bellBtn = document.getElementById('bellBtn');
        bellBtn.style.display = 'flex';

        var unreadCount = notifs.filter(function(n) { return !n.read; }).length;
        updateBadge(unreadCount);

        if (notifs.length === 0) {
          emptyState.style.display = 'block';
          return;
        }

        document.getElementById('notifsList').innerHTML = notifs.map(renderPageNotif).join('');
        document.getElementById('markAllBar').style.display = unreadCount > 0 ? 'block' : 'none';
        notifsContent.style.display = 'block';
      } catch (err) {
        loading.style.display = 'none';
        errorState.style.display = 'block';
      }
    }

    document.addEventListener('click', function(e) {
      var dropdown = document.getElementById('notifDropdown');
      var bellBtn = document.getElementById('bellBtn');
      if (dropdown && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    loadNotifications();
  </script>
</body>
</html>`;
}
