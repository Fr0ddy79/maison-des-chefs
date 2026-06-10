// Admin Chef Applications Review Page (MAI-2505)
// Shows pending chef applications with approve/reject capability

export default function buildAdminChefApplicationsPage(): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chef Applications | Admin Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
  nav .nav-links a:hover { opacity: 0.8; }
  nav .nav-links a.active { color: #c9a227; }

  .page-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); padding: 6rem 2rem 2rem; color: white; text-align: center; }
  .page-header h1 { font-size: clamp(2rem, 5vw, 2.5rem); margin-bottom: 0.5rem; }
  .page-header p { opacity: 0.9; font-size: 1rem; }

  .stats-bar { background: white; padding: 1.5rem 2rem; display: flex; justify-content: center; gap: 3rem; margin-top: -1.5rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); max-width: 600px; margin-left: auto; margin-right: auto; }
  .stat-item { text-align: center; }
  .stat-number { font-size: 2rem; font-weight: 800; color: #2c3e50; }
  .stat-label { color: #888; font-size: 0.85rem; margin-top: 0.25rem; }
  .stat-number.pending { color: #e67e22; }
  .stat-number.approved { color: #27ae60; }
  .stat-number.rejected { color: #c0392b; }

  .main-content { max-width: 1100px; margin: 2rem auto; padding: 0 1.5rem; }

  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .section-header h2 { font-size: 1.3rem; color: #2c3e50; }

  .filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: white; border-radius: 8px; padding: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .filter-tab { padding: 0.6rem 1.2rem; border: none; background: transparent; border-radius: 6px; font-size: 0.95rem; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s; }
  .filter-tab:hover { background: #f0f0f0; }
  .filter-tab.active { background: #2c3e50; color: white; }
  .filter-tab .count { background: rgba(0,0,0,0.1); padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-left: 0.4rem; }
  .filter-tab.active .count { background: rgba(255,255,255,0.2); }

  .applications-list { display: flex; flex-direction: column; gap: 1rem; }

  .application-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 1.5rem; display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; transition: box-shadow 0.2s; }
  .application-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
  .application-card .app-info { display: flex; flex-direction: column; gap: 0.5rem; }
  .application-card .app-name { font-size: 1.1rem; font-weight: 700; color: #2c3e50; }
  .application-card .app-email { font-size: 0.9rem; color: #666; }
  .application-card .app-meta { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: #888; }
  .application-card .app-meta span { display: flex; align-items: center; gap: 0.3rem; }
  .application-card .app-cuisines { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .application-card .cuisine-tag { background: #f0f0f0; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.78rem; color: #555; }
  .application-card .app-actions { display: flex; gap: 0.75rem; }

  .btn { padding: 0.6rem 1.2rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-view { background: #f0f0f0; color: #333; }
  .btn-view:hover { background: #e0e0e0; }
  .btn-approve { background: #27ae60; color: white; }
  .btn-approve:hover { background: #219a52; }
  .btn-reject { background: #e74c3c; color: white; }
  .btn-reject:hover { background: #c0392b; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .loading-state { text-align: center; padding: 4rem 2rem; }
  .loading-state .spinner { width: 48px; height: 48px; border: 4px solid #f3f3f3; border-top: 4px solid #2c3e50; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  .empty-state { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .empty-state h2 { color: #2c3e50; margin-bottom: 0.5rem; }
  .empty-state p { color: #666; }

  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }

  /* Modal */
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .modal-overlay.open { display: flex; }
  .modal { background: white; border-radius: 16px; max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
  .modal-header { padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
  .modal-header h3 { font-size: 1.2rem; color: #2c3e50; }
  .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; padding: 0; line-height: 1; }
  .modal-close:hover { color: #333; }
  .modal-body { padding: 1.5rem; }
  .modal-field { margin-bottom: 1.25rem; }
  .modal-field label { display: block; font-size: 0.8rem; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem; }
  .modal-field .value { font-size: 1rem; color: #333; }
  .modal-field .value.multiline { white-space: pre-wrap; line-height: 1.5; }
  .modal-field .cuisine-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .modal-field .cuisine-tag { background: #f0f0f0; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; color: #555; }
  .modal-actions { padding: 1.5rem; border-top: 1px solid #eee; display: flex; gap: 0.75rem; justify-content: flex-end; }

  /* Toast */
  .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 8px; font-weight: 600; z-index: 2000; transform: translateY(100px); opacity: 0; transition: all 0.3s; }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast.success { background: #27ae60; color: white; }
  .toast.error { background: #e74c3c; color: white; }

  @media (max-width: 640px) {
    .application-card { grid-template-columns: 1fr; }
    .application-card .app-actions { justify-content: flex-start; }
    .stats-bar { flex-direction: column; gap: 1rem; }
  }
</style>
</head>
<body>
<nav>
  <a href="/" class="logo">Maison des Chefs</a>
  <div class="nav-links">
    <a href="/chefs">Browse Chefs</a>
    <a href="/services">Services</a>
    <a href="/admin/applications" class="active">Chef Applications</a>
  </div>
</nav>

<section class="page-header">
  <h1>Chef Applications</h1>
  <p>Review and approve chef applications</p>
</section>

<div class="stats-bar">
  <div class="stat-item">
    <div class="stat-number pending" id="statPending">0</div>
    <div class="stat-label">Pending</div>
  </div>
  <div class="stat-item">
    <div class="stat-number approved" id="statApproved">0</div>
    <div class="stat-label">Approved</div>
  </div>
  <div class="stat-item">
    <div class="stat-number rejected" id="statRejected">0</div>
    <div class="stat-label">Rejected</div>
  </div>
</div>

<div class="main-content">
  <div class="filter-tabs">
    <button class="filter-tab active" data-status="pending">Pending <span class="count" id="countPending">0</span></button>
    <button class="filter-tab" data-status="approved">Approved <span class="count" id="countApproved">0</span></button>
    <button class="filter-tab" data-status="rejected">Rejected <span class="count" id="countRejected">0</span></button>
    <button class="filter-tab" data-status="all">All <span class="count" id="countAll">0</span></button>
  </div>

  <div id="loadingState" class="loading-state"><div class="spinner"></div><p>Loading applications...</p></div>
  <div id="emptyState" class="empty-state" style="display:none">
    <h2>No applications found</h2>
    <p>There are no applications matching this filter.</p>
  </div>
  <div id="applicationsList" class="applications-list"></div>
</div>

<!-- Detail Modal -->
<div id="detailModal" class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h3>Application Details</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
    <div class="modal-actions" id="modalActions"></div>
  </div>
</div>

<!-- Toast -->
<div id="toast" class="toast"></div>

<footer>
  <div class="logo">Maison des Chefs</div>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
</footer>

<script>
var allApplications = [];
var currentFilter = 'pending';

function escapeHtml(text) {
  if (text == null) return '';
  var div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadApplications() {
  var loadingEl = document.getElementById('loadingState');
  var emptyEl = document.getElementById('emptyState');
  var listEl = document.getElementById('applicationsList');

  try {
    var res = await fetch('/api/admin/chef-applications');
    var data = await res.json();
    allApplications = data.applications || [];

    updateStats();
    renderList(currentFilter);
    loadingEl.style.display = 'none';
  } catch (err) {
    loadingEl.innerHTML = '<p style="color:#e74c3c">Failed to load applications. Please refresh.</p>';
  }
}

function updateStats() {
  var counts = { pending: 0, approved: 0, rejected: 0, all: allApplications.length };
  for (var i = 0; i < allApplications.length; i++) {
    var s = allApplications[i].status;
    if (counts[s] !== undefined) counts[s]++;
  }
  document.getElementById('statPending').textContent = counts.pending;
  document.getElementById('statApproved').textContent = counts.approved;
  document.getElementById('statRejected').textContent = counts.rejected;
  document.getElementById('countPending').textContent = counts.pending;
  document.getElementById('countApproved').textContent = counts.approved;
  document.getElementById('countRejected').textContent = counts.rejected;
  document.getElementById('countAll').textContent = counts.all;
}

function renderList(status) {
  var emptyEl = document.getElementById('emptyState');
  var listEl = document.getElementById('applicationsList');

  var filtered = status === 'all' ? allApplications : allApplications.filter(function(a) { return a.status === status; });

  if (filtered.length === 0) {
    emptyEl.style.display = 'block';
    listEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.style.display = 'flex';

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var app = filtered[i];
    var cuisines = app.cuisineTypes || [];
    var cuisineTags = '';
    for (var j = 0; j < cuisines.length; j++) {
      cuisineTags += '<span class="cuisine-tag">' + escapeHtml(cuisines[j]) + '</span>';
    }
    if (!cuisineTags) cuisineTags = '<span class="cuisine-tag">Not specified</span>';

    var actionsHtml = '';
    if (app.status === 'pending') {
      actionsHtml = '<button class="btn btn-view" onclick="openModal(' + app.id + ')">View Details</button>' +
                    '<button class="btn btn-approve" onclick="reviewApplication(' + app.id + ', \\'approve\\')">Approve</button>' +
                    '<button class="btn btn-reject" onclick="reviewApplication(' + app.id + ', \\'reject\\')">Reject</button>';
    } else {
      actionsHtml = '<button class="btn btn-view" onclick="openModal(' + app.id + ')">View Details</button>';
    }

    html += '<div class="application-card">' +
      '<div class="app-info">' +
        '<div class="app-name">' + escapeHtml(app.name) + '</div>' +
        '<div class="app-email">' + escapeHtml(app.email) + '</div>' +
        '<div class="app-meta">' +
          '<span>📍 ' + escapeHtml(app.location || 'Not specified') + '</span>' +
          '<span>🍳 ' + app.yearsExperience + ' years experience</span>' +
          '<span>📅 Applied ' + formatDate(app.createdAt) + '</span>' +
        '</div>' +
        '<div class="app-cuisines">' + cuisineTags + '</div>' +
      '</div>' +
      '<div class="app-actions">' + actionsHtml + '</div>' +
    '</div>';
  }
  listEl.innerHTML = html;
}

function openModal(id) {
  var app = allApplications.find(function(a) { return a.id === id; });
  if (!app) return;

  var cuisines = app.cuisineTypes || [];
  var cuisineTags = '';
  for (var j = 0; j < cuisines.length; j++) {
    cuisineTags += '<span class="cuisine-tag">' + escapeHtml(cuisines[j]) + '</span>';
  }
  if (!cuisineTags) cuisineTags = '<span class="cuisine-tag">Not specified</span>';

  var modalBody = document.getElementById('modalBody');
  modalBody.innerHTML =
    '<div class="modal-field"><label>Name</label><div class="value">' + escapeHtml(app.name) + '</div></div>' +
    '<div class="modal-field"><label>Email</label><div class="value">' + escapeHtml(app.email) + '</div></div>' +
    '<div class="modal-field"><label>Location</label><div class="value">' + escapeHtml(app.location || 'Not specified') + '</div></div>' +
    '<div class="modal-field"><label>Cuisine Types</label><div class="cuisine-tags">' + cuisineTags + '</div></div>' +
    '<div class="modal-field"><label>Years of Experience</label><div class="value">' + app.yearsExperience + '</div></div>' +
    '<div class="modal-field"><label>Bio</label><div class="value multiline">' + escapeHtml(app.bio || 'No bio provided') + '</div></div>' +
    '<div class="modal-field"><label>Applied On</label><div class="value">' + formatDate(app.createdAt) + '</div></div>';

  var modalActions = document.getElementById('modalActions');
  if (app.status === 'pending') {
    modalActions.innerHTML =
      '<button class="btn btn-reject" onclick="reviewApplication(' + app.id + ', \\'reject\\'); closeModal();">Reject</button>' +
      '<button class="btn btn-approve" onclick="reviewApplication(' + app.id + ', \\'approve\\'); closeModal();">Approve</button>';
  } else {
    var statusLabel = app.status.charAt(0).toUpperCase() + app.status.slice(1);
    modalActions.innerHTML = '<span style="color:#888;align-self:center;">Status: ' + statusLabel + (app.reviewedAt ? ' on ' + formatDate(app.reviewedAt) : '') + '</span>';
  }

  document.getElementById('detailModal').classList.add('open');
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
}

async function reviewApplication(id, action) {
  var btn = action === 'approve'
    ? document.querySelector('.btn-approve[onclick*="' + id + '"]')
    : document.querySelector('.btn-reject[onclick*="' + id + '"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

  try {
    var res = await fetch('/api/admin/chef-applications/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, adminId: 1 })
    });
    var data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to ' + action + ' application', 'error');
      return;
    }

    showToast('Application ' + (action === 'approve' ? 'approved' : 'rejected') + ' successfully', 'success');
    await loadApplications();
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  }
}

function showToast(message, type) {
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(function() { toast.classList.remove('show'); }, 4000);
}

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.filter-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    currentFilter = tab.getAttribute('data-status');
    renderList(currentFilter);
  });
});

// Close modal on overlay click
document.getElementById('detailModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Initial load
loadApplications();
<\/script>
</body>
</html>`;

  return html;
}