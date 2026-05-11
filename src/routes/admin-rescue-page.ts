// Operator Rescue Dashboard Page (MAI-1281)
// Shows all bookings with WhatsApp rescue capability

import { db } from '../db/index.js';
import { bookings, services, users, chefProfiles } from '../db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';

export default function buildAdminRescuePage(): string {
  // Fetch all bookings (will be loaded client-side with filter)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Operator Rescue Dashboard | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
  nav .nav-links a:hover { opacity: 0.8; }

  .page-header { background: linear-gradient(135deg, #c0392b 0%, #922b21 100%); padding: 6rem 2rem 2rem; color: white; text-align: center; }
  .page-header h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 0.5rem; }
  .page-header p { opacity: 0.9; font-size: 1.1rem; }
  .page-header .rescue-count { background: rgba(255,255,255,0.2); border-radius: 8px; padding: 1rem 2rem; display: inline-block; margin-top: 1rem; }
  .page-header .rescue-count .amount { font-size: 2.5rem; font-weight: bold; }
  .page-header .rescue-count .label { font-size: 0.9rem; opacity: 0.9; }

  .main-content { max-width: 1200px; margin: 2rem auto; padding: 0 1.5rem; }

  .filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: white; border-radius: 8px; padding: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .filter-tab { padding: 0.6rem 1.2rem; border: none; background: transparent; border-radius: 6px; font-size: 0.95rem; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s; }
  .filter-tab:hover { background: #f0f0f0; }
  .filter-tab.active { background: #c0392b; color: white; }
  .filter-tab .count { background: rgba(0,0,0,0.1); padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-left: 0.4rem; }

  .bookings-table { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
  .bookings-table table { width: 100%; border-collapse: collapse; }
  .bookings-table th { background: #f8f9fa; padding: 1rem 1.25rem; text-align: left; font-weight: 600; color: #555; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .bookings-table td { padding: 1rem 1.25rem; border-top: 1px solid #eee; font-size: 0.95rem; }
  .bookings-table tr:hover td { background: #fafafa; }
  .bookings-table .booking-id { font-family: monospace; font-size: 0.85rem; color: #888; }
  .bookings-table .chef-name { font-weight: 600; color: #2c3e50; }
  .bookings-table .diner-name { color: #555; }
  .bookings-table .event-date { color: #333; }
  .bookings-table .guests { text-align: center; }
  .bookings-table .total-price { font-weight: 700; color: #2c3e50; }
  .bookings-table .status-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  .bookings-table .status-pending { background: #fff3cd; color: #856404; }
  .bookings-table .status-accepted { background: #d4edda; color: #155724; }
  .bookings-table .status-declined { background: #f8d7da; color: #721c24; }
  .bookings-table .status-confirmed { background: #d4edda; color: #155724; }
  .bookings-table .status-completed { background: #e2e3e5; color: #495057; }
  .bookings-table .days-pending { text-align: center; }
  .bookings-table .days-old { font-weight: 700; color: #c0392b; }
  .bookings-table .days-warning { color: #e65100; }

  .action-btn { background: #25d366; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none; }
  .action-btn:hover { background: #1da851; }
  .action-btn svg { width: 16px; height: 16px; }
  .action-btn.rescue-sent { background: #888; cursor: not-allowed; }
  .action-btn.rescue-sent:hover { background: #888; }

  .rescue-checkbox { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #666; cursor: pointer; }
  .rescue-checkbox input { width: 16px; height: 16px; accent-color: #25d366; }
  .rescue-timestamp { font-size: 0.8rem; color: #888; margin-top: 0.25rem; }

  .loading-state { text-align: center; padding: 4rem 2rem; }
  .loading-state .spinner { width: 48px; height: 48px; border: 4px solid #f3f3f3; border-top: 4px solid #c0392b; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .empty-state { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .empty-state h2 { color: #2c3e50; margin-bottom: 0.5rem; }
  .empty-state p { color: #666; }

  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }

  @media (max-width: 900px) {
    .bookings-table { overflow-x: auto; }
    .bookings-table table { min-width: 800px; }
    .page-header { padding-top: 5rem; }
  }
</style>
</head>
<body>
<nav>
  <a href="/" class="logo">Maison des Chefs</a>
  <div class="nav-links">
    <a href="/chefs">Browse Chefs</a>
    <a href="/services">Services</a>
    <a href="/admin/rescue">Operator Rescue</a>
  </div>
</nav>

<section class="page-header">
  <h1>Operator Rescue Dashboard</h1>
  <p>Monitor and rescue pending bookings via direct WhatsApp outreach</p>
  <div class="rescue-count">
    <div class="amount" id="totalPendingAmount">$0</div>
    <div class="label">from <span id="pendingCount">0</span> pending bookings</div>
  </div>
</section>

<div class="main-content">
  <div class="filter-tabs">
    <button class="filter-tab active" data-status="all">All <span class="count" id="countAll">0</span></button>
    <button class="filter-tab" data-status="pending">Pending <span class="count" id="countPending">0</span></button>
    <button class="filter-tab" data-status="accepted">Accepted <span class="count" id="countAccepted">0</span></button>
    <button class="filter-tab" data-status="declined">Declined <span class="count" id="countDeclined">0</span></button>
  </div>

  <div id="loadingState" class="loading-state"><div class="spinner"></div><p>Loading bookings...</p></div>
  <div id="emptyState" class="empty-state" style="display:none">
    <h2>No bookings found</h2>
    <p>There are no bookings matching this filter.</p>
  </div>

  <div class="bookings-table" id="bookingsTable" style="display:none">
    <table>
      <thead>
        <tr>
          <th>Booking ID</th>
          <th>Chef</th>
          <th>Diner</th>
          <th>Event Date</th>
          <th>Guests</th>
          <th>Total</th>
          <th>Status</th>
          <th>Days Old</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="bookingsBody">
      </tbody>
    </table>
  </div>
</div>

<footer>
  <div class="logo">Maison des Chefs</div>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
</footer>

<script>
var API_BASE = '';
var allBookings = [];
var rescueState = JSON.parse(localStorage.getItem('rescueState') || '{}');

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadBookings() {
  try {
    var response = await fetch('/api/admin/bookings?status=all');
    var data = await response.json();
    allBookings = data.bookings || [];
    renderBookings('all');
    updateCounts();
  } catch (err) {
    console.error('Error loading bookings:', err);
    document.getElementById('loadingState').innerHTML = '<p style="color:#c0392b">Error loading bookings. Please refresh.</p>';
  }
}

function updateCounts() {
  var counts = { all: allBookings.length, pending: 0, accepted: 0, declined: 0 };
  for (var i = 0; i < allBookings.length; i++) {
    var status = allBookings[i].status;
    if (counts[status] !== undefined) counts[status]++;
  }
  document.getElementById('countAll').textContent = counts.all;
  document.getElementById('countPending').textContent = counts.pending;
  document.getElementById('countAccepted').textContent = counts.accepted;
  document.getElementById('countDeclined').textContent = counts.declined;

  // Total pending amount
  var totalPending = 0;
  var pendingCount = 0;
  for (var i = 0; i < allBookings.length; i++) {
    if (allBookings[i].status === 'pending') {
      totalPending += allBookings[i].totalPrice || 0;
      pendingCount++;
    }
  }
  document.getElementById('totalPendingAmount').textContent = '$' + totalPending.toFixed(0);
  document.getElementById('pendingCount').textContent = pendingCount;
}

function renderBookings(status) {
  var loadingEl = document.getElementById('loadingState');
  var emptyEl = document.getElementById('emptyState');
  var tableEl = document.getElementById('bookingsTable');

  loadingEl.style.display = 'none';

  var filtered = status === 'all'
    ? allBookings
    : allBookings.filter(function(b) { return b.status === status; });

  if (filtered.length === 0) {
    emptyEl.style.display = 'block';
    tableEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  tableEl.style.display = 'block';

  var tbody = document.getElementById('bookingsBody');
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var booking = filtered[i];
    var rescueKey = 'booking_' + booking.id;
    var isRescued = rescueState[rescueKey];
    var rescueBtnClass = isRescued ? 'action-btn rescue-sent' : 'action-btn';
    var rescueBtnText = isRescued ? 'Rescue Sent ✓' : 'Rescue via WhatsApp';
    var lastAttempt = isRescued ? new Date(rescueState[rescueKey].timestamp).toLocaleString() : '';

    // WhatsApp message
    var message = 'Hi Chef ' + escapeHtml(booking.chefName) + '! You have a new booking request: ' +
      escapeHtml(booking.dinerName) + ', ' + escapeHtml(booking.eventDate) + ', ' +
      booking.guests + ' guests, $' + (booking.totalPrice || 0).toFixed(0) + '. Please confirm or decline: https://maisondeschefs.com/chef/bookings';
    var whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(message);

    // Days old styling
    var daysClass = booking.daysPending >= 14 ? 'days-old' : (booking.daysPending >= 7 ? 'days-warning' : '');
    var daysOld = booking.daysPending + 'd';

    // Status badge
    var statusBadgeClass = 'status-badge status-' + booking.status;

    html += '<tr>' +
      '<td class="booking-id">#' + booking.id + '</td>' +
      '<td class="chef-name">' + escapeHtml(booking.chefName) + '</td>' +
      '<td class="diner-name">' + escapeHtml(booking.dinerName) + '<br><span style="font-size:0.85rem;color:#888;">' + escapeHtml(booking.dinerEmail || '') + '</span></td>' +
      '<td class="event-date">' + escapeHtml(booking.eventDate) + '</td>' +
      '<td class="guests" style="text-align:center">' + booking.guests + '</td>' +
      '<td class="total-price">$' + (booking.totalPrice || 0).toFixed(0) + '</td>' +
      '<td><span class="' + statusBadgeClass + '">' + booking.status + '</span></td>' +
      '<td class="days-pending"><span class="' + daysClass + '">' + daysOld + '</span></td>' +
      '<td>' +
        '<a href="' + whatsappUrl + '" target="_blank" class="' + rescueBtnClass + '" onclick="markRescueSent(' + booking.id + ')">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
          rescueBtnText +
        '</a>' +
        (lastAttempt ? '<div class="rescue-timestamp">Last: ' + escapeHtml(lastAttempt) + '</div>' : '') +
        '<label class="rescue-checkbox" style="margin-top:0.5rem;display:block;">' +
          '<input type="checkbox" ' + (isRescued ? 'checked' : '') + ' onchange="toggleRescueSent(' + booking.id + ')">' +
          'Rescue sent' +
        '</label>' +
      '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
}

function markRescueSent(bookingId) {
  rescueState['booking_' + bookingId] = { timestamp: Date.now() };
  localStorage.setItem('rescueState', JSON.stringify(rescueState));
}

function toggleRescueSent(bookingId) {
  var key = 'booking_' + bookingId;
  if (rescueState[key]) {
    delete rescueState[key];
  } else {
    rescueState[key] = { timestamp: Date.now() };
  }
  localStorage.setItem('rescueState', JSON.stringify(rescueState));
  renderBookings(getCurrentFilter());
}

// Tab filtering
var currentFilter = 'all';
function getCurrentFilter() { return currentFilter; }

document.querySelectorAll('.filter-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.filter-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    currentFilter = tab.getAttribute('data-status');
    renderBookings(currentFilter);
  });
});

// Initial load
loadBookings();
<\/script>
</body>
</html>`;

  return html;
}
